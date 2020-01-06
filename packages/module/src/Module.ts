import {Module as _Module, StandardActions} from '@pallad/modules';
import {Container, onActivation} from "alpha-dic";
import {commandHandlerObjectAnnotation} from "./commandHandlerObjectAnnotation";
import {CommandBus, CommandHandlerDescriptor, getCommandHandlersFromObject} from "alpha-command-bus";
import {commandHandlerAnnotation} from "./commandHandlerAnnotation";
import {References} from "./References";

export class Module extends _Module<{ container: Container }> {
    private config: Module.Config;

    constructor(config: Module.Config.FromUser = {}) {
        super('alpha-command-bus-module');

        this.config = {
            initCommandBus: config.initCommandBus !== undefined ? config.initCommandBus : true,
            createCommandBus: () => {
                return new CommandBus();
            }
        }
    }

    protected init(): void {
        if (this.config.initCommandBus) {
            this.registerAction(StandardActions.INITIALIZATION, context => {
                context.container.definitionWithFactory(References.COMMAND_BUS, this.config.createCommandBus)
                    .annotate(onActivation(async function (this: Container, service: CommandBus) {
                        const commandHandlers = await Module.getCommandHandlersFromContainer(context.container);
                        service.registerCommandHandlers(commandHandlers);
                        return service;
                    }))
            })
        }
    }

    static async getCommandHandlersFromContainer(container: Container) {
        let descriptors: CommandHandlerDescriptor[] = [];

        const objects = await container.getByAnnotation(commandHandlerObjectAnnotation.PREDICATE);
        for (const object of objects) {
            descriptors = descriptors.concat(getCommandHandlersFromObject(object));
        }

        const handlers = await container.getByAnnotation(commandHandlerAnnotation.PREDICATE);
        for (const handler of handlers) {
            const handlersArray = Array.isArray(handler) ? handler : [handler];
            for (const handler of handlersArray) {
                if (handler instanceof CommandHandlerDescriptor) {
                    descriptors.push(handler);
                }
            }
        }
        return descriptors;
    }
}

export namespace Module {
    export interface Config {
        initCommandBus: Boolean;
        createCommandBus: () => CommandBus
    }

    export namespace Config {
        export type FromUser = Partial<Pick<Config, 'initCommandBus' | 'createCommandBus'>>;
    }


}