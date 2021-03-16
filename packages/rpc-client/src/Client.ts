import {Serializer, serializer as _serializer} from "alpha-serializer";
import {Middleware} from "./Middleware";
import superagent = require('superagent');
import {Readable} from 'stream';
import {isReadableStream} from './isReadableStream';
import {Command, CommandRunner} from 'alpha-command-bus-core';

export class Client<T = undefined> {
    private serializer: Serializer;
    private middlewares: Array<Middleware<T>> = [];

    constructor(private url: string, serializer?: Serializer) {
        this.serializer = serializer || _serializer;
        this.middlewares.push(
            async (context, next) => {

                const response: superagent.Response = await context.request;
                if (response.status !== 200) {
                    throw new Error(`Invalid response status: ${response.status}`);
                }

                const stream = (response as any).res;
                if (response.get('content-type') === 'application/octet-stream') {
                    return stream;
                }
                if (response.get('X-command-bus-error') === '1') {
                    throw response.body;
                }
                return response.body
            }
        )
    }

    use(...middlewares: Array<Middleware<T>>): this {
        this.middlewares.unshift(...middlewares);
        return this;
    }

    asCommandRunner<TResult = any>(): CommandRunner<TResult, T> {
        return (...args) => this.handle(...args);
    }

    async handle<TResult>(command: Command, contextData: T): Promise<TResult> {
        let currentMiddleware = 0;

        // make a copy to prevent changing the chain during execution
        const middlewares = this.middlewares.slice();

        const request = superagent
            .post(this.url)
            .buffer(false)
            // tslint:disable-next-line:no-async-without-await
            .parse(async (res, cb) => {
                if ((res.headers['content-type'] || '').includes('application/json')) {
                    let data = '';
                    for await (const chunk of res) {
                        data += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;
                    }
                    if (data.length === 0) {
                        // tslint:disable-next-line:no-null-keyword
                        cb(null, undefined);
                    } else {
                        const deserialized = this.serializer.deserialize(data);
                        // tslint:disable-next-line:no-null-keyword
                        cb(null, deserialized);
                    }
                } else {
                    // tslint:disable-next-line:no-null-keyword
                    cb(null, undefined);
                }
            })
            .set('content-type', 'application/json')
            .set('accept', 'application/json');

        const commandData = this.getCommandData(command);

        if ('files' in commandData) {
            for (const [key, stream] of Object.entries(commandData.files)) {
                request.attach(key, stream as any);
            }
            request.field('commandBody', this.serializer.serialize(commandData.command));
        } else {
            request.send(this.serializer.serialize(command));
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
}

export namespace Client {
    export interface Context<T> {
        request: superagent.Request;
        command: Command;
        context: T;
    }
}
