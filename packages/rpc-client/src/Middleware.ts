import {Client} from "./Client";

export type Middleware<TRequest extends Client.Context = Client.Context> = (next: Middleware.Next<TRequest>, request: Client.Request<TRequest>) => Promise<any>;

export namespace Middleware {
    export type Next<TRequest extends Client.Context = Client.Context> = (request: Client.Request<TRequest>) => Promise<any>;
}