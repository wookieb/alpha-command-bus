import {Serializer, serializer as _serializer} from "alpha-serializer";
import fetch, {Headers, RequestInfo, RequestInit} from 'node-fetch';
import {Middleware} from "./Middleware";

export interface Command {
    command: string;
}

export class Client<TContext extends Client.Context = Client.Context> {
    private serializer: Serializer;

    private middlewares: Array<Middleware<TContext>> = [];

    constructor(private url: string, serializer?: Serializer) {
        this.serializer = serializer || _serializer;
        this.middlewares.push(
            async (next, request) => {
                request.init.body = this.serializer.serialize(request.context.command);

                const result = await fetch(request.url, request.init);
                if (result.status !== 200) {
                    throw new Error(`Invalid response status: ${result.status}`);
                }

                const body = await result.text();
                const deserialized = this.serializer.deserialize(body);
                if (result.headers.get('X-command-bus-error') === '1') {
                    throw deserialized;
                }
                return deserialized;
            }
        )
    }

    use(...middlewares: Array<Middleware<TContext>>): this {
        this.middlewares.unshift(...middlewares);
        return this;
    }

    async handle<T>(command: Command, contextData?: Record<any, any>): Promise<T> {
        let currentMiddleware = 0;

        // make a copy to prevent changing the chain during execution
        const middlewares = this.middlewares.slice();
        const request: Client.Request<TContext> = {
            url: this.url,
            init: {
                method: 'post',
                headers: new Headers({
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                })
            },
            // tslint:disable-next-line:no-object-literal-type-assertion
            context: {
                ...(contextData || {}),
                command
            } as TContext
        };

        const next = (request: Client.Request<TContext>) => {
            let nextMiddleware = middlewares[++currentMiddleware];
            return nextMiddleware(next, request);
        };
        return this.middlewares[0](next, request) as any as T;
    }
}

export namespace Client {
    export interface Request<T extends Context = Context> {
        url: RequestInfo;
        init: RequestInit;
        context: T;
    }

    export interface Context {
        command: Command;
    }
}