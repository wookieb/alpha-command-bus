import * as express from 'express';
import {Command, CommandBus} from 'alpha-command-bus';


export const DEFAULT_RESULT_HANDLER = (result: any, context: Mapper.Context) => {
    context.response.send(result);
};

export const DEFAULT_ERROR_HANDLER = (result: any, context: Mapper.Context) => {
    context.response.status(500).send(result);
};

export class Mapper {
    constructor(private commandBus: CommandBus, private config: Partial<Mapper.Config> = {}) {

    }

    map(mapper: (req: express.Request) => Command, config?: Partial<Mapper.Config>) {
        return async (request: express.Request, response: express.Response) => {
            const command = mapper(request);

            const context: Mapper.Context = {
                command,
                request,
                response
            };

            try {
                const result = await this.commandBus.handle(command);

                const localResultHandler = (config && config.resultHandler);
                const parentResultHandler = (this.config && this.config.resultHandler) || DEFAULT_RESULT_HANDLER;

                if (localResultHandler) {
                    await localResultHandler(result, context, parentResultHandler);
                } else {
                    await parentResultHandler(result, context);
                }
            } catch (e) {
                const localErrorHandler = (config && config.errorHandler);
                const parentErrorHandler = (this.config && this.config.errorHandler) || DEFAULT_ERROR_HANDLER;

                if (localErrorHandler) {
                    localErrorHandler(e, context, parentErrorHandler);
                } else {
                    parentErrorHandler(e, context);
                }
            }
        }
    }

    static create(commandBus: CommandBus, config: Partial<Mapper.Config>) {
        const mapper = new Mapper(commandBus, config);

        return mapper.map.bind(mapper);
    }
}

export namespace Mapper {
    export interface Context {
        request: express.Request,
        command: Command,
        response: express.Response
    }

    export interface Config {
        resultHandler: ResultHandler,
        errorHandler: ErrorHandler
    }

    export type ResultHandler = (result: any, context: Context, parentResultHandler?: ResultHandler) => any;
    export type ErrorHandler = (error: any, context: Context, parentErrorHandler?: ErrorHandler) => any;
}