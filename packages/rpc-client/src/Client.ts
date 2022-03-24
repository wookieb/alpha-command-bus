import {Serializer, serializer as _serializer} from "alpha-serializer";
import {Middleware} from "./Middleware";
import {Readable} from 'stream';
import {isReadableStream} from './isReadableStream';
import {Command, CommandRunner} from 'alpha-command-bus-core';
import {Dispatcher, Pool} from 'undici';
import {FormData, File} from 'formdata-node';
import {FormDataEncoder} from 'form-data-encoder';


export class Client<T = undefined> {
    private serializer: Serializer;
    private middlewares: Array<Middleware<T>> = [];

    private url: URL;

    private pool: Pool;

    constructor(url: string | URL, serializer?: Serializer) {
        this.serializer = serializer || _serializer;
        this.url = url instanceof URL ? url : new URL(url);

        const originUrl = new URL(this.url.toString());
        originUrl.pathname = '/';
        originUrl.search = '';
        originUrl.hash = '';

        this.pool = new Pool(originUrl);

        this.middlewares.push(
            async (context, next) => {

                const response = await this.pool.request(context.request);
                if (response.statusCode !== 200) {
                    throw new Error(`Invalid response status: ${response.statusCode}`);
                }

                if (response.headers["content-type"] === 'application/octet-stream') {
                    return response.body;
                }

                const body = await response.body.text();
                const parsed = body.length === 0 ? undefined : this.serializer.deserialize(body);
                if (response.headers['x-command-bus-error'] === '1') {
                    throw parsed;
                }
                return parsed;
            }
        )
    }

    use(...middlewares: Array<Middleware<T>>): this {
        this.middlewares.unshift(...middlewares);
        return this;
    }

    asCommandRunner<TResult = any>(): CommandRunner<TResult, T> {
        return this.handle.bind(this);
    }

    async handle<TResult>(command: Command, contextData: T): Promise<TResult> {
        let currentMiddleware = 0;

        // make a copy to prevent changing the chain during execution
        const middlewares = this.middlewares.slice();

        const request: Dispatcher.RequestOptions = {
            path: this.url.pathname,
            method: 'POST',
            headers: {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'content-type': 'application/json',
                accept: 'application/json'
            }
        };

        const commandData = this.getCommandData(command);

        if ('files' in commandData) {
            const formData = new FormData();
            formData.append('commandBody', this.serializer.serialize(commandData.command));

            for (const [key, stream] of Object.entries(commandData.files)) {
                formData.set(key, {
                    type: "application/octet-stream",
                    name: 'octetStream',
                    [Symbol.toStringTag]: "File",
                    stream() {
                        return stream;
                    }
                });
            }
            const encoder = new FormDataEncoder(formData)
            request.headers = {
                ...request.headers,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                'content-type': encoder.contentType,
            };
            request.body = Readable.from(encoder)
        } else {
            request.body = this.serializer.serialize(command);
        }

        const context: Client.Context<T> = {
            context: contextData,
            request: request,
            command: command,
        };

        const next = (context: Client.Context<T>) => {
            let nextMiddleware = middlewares[++currentMiddleware];
            return nextMiddleware(context, next);
        };
        return this.middlewares[0](context, next) as any as Promise<TResult>;
    }

    private getCommandData(command: Command): Command | { files: Record<string, Readable>, command: Record<string, any> } {
        const files = Object.entries(command)
            .filter(([, value]) => {
                return isReadableStream(value);
            });

        if (files.length > 0) {
            const filesKeys = new Set(files.map(x => x[0]));
            return {
                files: Object.fromEntries(files),
                command: Object.fromEntries(
                    Object.entries(command)
                        .filter(([key]) => {
                            return !filesKeys.has(key);
                        })
                )
            };
        }
        return command;
    }

    close() {
        return this.pool.destroy();
    }
}

export namespace Client {
    export interface Context<T> {
        request: Dispatcher.RequestOptions;
        command: Command;
        context: T;
    }
}
