import {Serializer, serializer as _serializer} from "alpha-serializer";
import {Middleware} from "./Middleware";
import superagent = require('superagent');
import {Readable} from 'stream';
import {isReadableStream} from './isReadableStream';
import streamToPromise = require('stream-to-promise');
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

                const buffers = [];
                for await (const chunk of stream) {
                    buffers.push(chunk);
                }
                const contentBuffer = Buffer.concat(buffers);

                const hasContent = Buffer.isBuffer(contentBuffer) && contentBuffer.length !== 0;
                const deserialized = !hasContent ? undefined :
                    this.serializer.deserialize(contentBuffer.toString('utf8'));
                if (response.get('X-command-bus-error') === '1') {
                    throw deserialized;
                }
                return deserialized;
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
            .parse((res, cb) => {
                // tslint:disable-next-line:no-null-keyword
                cb(null, undefined);
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
