import {Request, Response} from 'express';
import {Command, CommandBus} from 'alpha-command-bus';
import * as assert from 'assert';

export interface MappingContext {
    request: Request,
    command: Command,
    response: Response
}

export type ResultHandler = (result: any, context: MappingContext, parentResultHandler?: ResultHandler) => any;
export type ErrorHandler = (error: any, context: MappingContext, parentErrorHandler?: ErrorHandler) => any;

export interface MapperConfig {
    resultHandler: ResultHandler,
    errorHandler: ErrorHandler
}

export const DEFAULT_RESULT_HANDLER = (result: any, context: MappingContext) => {
    context.response.send(result);
};

export const DEFAULT_ERROR_HANDLER = (result: any, context: MappingContext) => {
    context.response.status(500).send(result);
};

export class Mapper {
    constructor(private commandBus: CommandBus, private config: Partial<MapperConfig> = {}) {
        assert.ok(this.commandBus instanceof CommandBus, 'command bus must be defined and be an instance of CommandBus');
    }

    map(mapper: (req: Request) => Command, config?: Partial<MapperConfig>) {
        return async (request: Request, response: Response) => {
            const command = mapper(request);

            const context = {
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
}