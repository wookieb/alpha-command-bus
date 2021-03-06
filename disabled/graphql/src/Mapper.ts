import {Command, CommandBus} from 'alpha-command-bus';
import * as assert from 'assert';

import {GraphQLResolveInfo} from "graphql";

export interface MappingContext {
    command: Command,
    context: any,
    source: any,
    args: { [argName: string]: any },
    info: GraphQLResolveInfo
}

export type ResultHandler = (result: any, context: MappingContext, parentResultHandler?: ResultHandler) => any;
export type ErrorHandler = (error: any, context: MappingContext, parentErrorHandler?: ErrorHandler) => any;

export interface MapperConfig {
    resultHandler: ResultHandler,
    errorHandler: ErrorHandler
}

export interface MapperWithDataloaderConfig extends MapperConfig {
    dataloader: boolean | {
        batch?: boolean
        maxBatchSize?: number
        cache?: boolean,
        cacheKeyFn?: (key: any) => string
        cacheMap?: Map<any, any>
    }
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

    map(mapper: (source: any, args: { [argName: string]: any }, context: any, info: GraphQLResolveInfo) => Command, config?: Partial<MapperWithDataloaderConfig>) {
        return async (...args: any) => {
            const command = mapper(...args);

            const context = {
                command,
                source: args[0]
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