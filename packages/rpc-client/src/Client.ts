import {Serializer, serializer} from "alpha-serializer";
import {GotInstance, extend as gotExtend, GotOptions, GotFn} from 'got';

export class Client {
    private got: GotInstance<GotFn>;

    private serializer: Serializer;

    constructor(private url: string, options: Client.Options = {}) {
        this.got = gotExtend({
            ...options.clientOptions,
            baseUrl: this.url,
            responseType: 'text',
            handlers: [
                async (options: any, next: (options: any) => any) => {
                    options.body = this.serializer.serialize(options.command);

                    const result = await next(options);

                    return this.serializer.deserialize(result.body);
                }
            ]
        } as any);

        this.serializer = options.serializer || serializer;
    }

    handle<T>(command: { command: string }, options: GotOptions<any> = {}): Promise<T> {
        return this.got('/', {
            ...options,
            command: command,
        } as any) as any as Promise<T>;
    }
}

export namespace Client {
    export interface Options {
        serializer?: Serializer;
        clientOptions?: GotOptions<string | null>
    }
}