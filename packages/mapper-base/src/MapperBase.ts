import {Command, CommandBus} from 'alpha-command-bus';
import * as assert from 'assert';

export type ResultHandler<TContext> = (result: any, context: TContext, parentResultHandler?: ResultHandler) => any;
export type ErrorHandler<TContext> = (error: any, context: TContext, parentErrorHandler?: ErrorHandler) => any;

export interface MapperConfig<TContext> {
    resultHandler: ResultHandler<TContext>,
    errorHandler: ErrorHandler<TContext>
}

export interface BaseMappingConfig {
    resultHandler: ResultHandler,
    errorHandler: ErrorHandler
}

export abstract class MapperBase<TMainConfig extends MapperConfig> {

    constructor(protected commandBus: CommandBus, protected config: TMainConfig = {}) {
        assert.ok(this.commandBus instanceof CommandBus, 'command bus must be defined and be an instance of CommandBus');
    }

    protected async handleCommandAndResult(command: Command, config?: Partial<BaseMappingConfig>) {
        try {
            const result = await this.commandBus.handle(command);

            const localResultHandler = (config && config.resultHandler);
            const parentResultHandler = (this.config && this.config.resultHandler);

            if (localResultHandler) {
                await localResultHandler(result, context, parentResultHandler);
            } else {
                await parentResultHandler(result, context);
            }

        } catch (e) {
            const localErrorHandler = (config && config.errorHandler);
            const parentErrorHandler = (this.config && this.config.errorHandler);

            if (localErrorHandler) {
                localErrorHandler(e, context, parentErrorHandler);
            } else {
                parentErrorHandler(e, context);
            }
        }
    }
}