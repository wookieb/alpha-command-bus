import {Client} from "./Client";

export type Middleware<T extends {}> = (context: Client.Context<T>, next: Middleware.Next<T>) => Promise<any>;

export namespace Middleware {
    export type Next<T extends {}> = (context: Client.Context<T>) => Promise<any>;
}
