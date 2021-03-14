import {CommandHandlerDescriptor} from "./CommandHandlerDescriptor";
import {Command, CommandRunner} from 'alpha-command-bus-core';


export class CommandBus {
    private middlewares: CommandBus.Middleware[] = [];
    private commandHandlers: CommandHandlerDescriptor[] = [];

    /**
     * Registers middleware that wraps process of handling a command
     */
    use(middleware: CommandBus.Middleware): this {
        this.middlewares.push(middleware);
        return this;
    }

    registerCommandHandler(filter: CommandHandlerDescriptor.Filter<any>, handler: CommandHandlerDescriptor.Func<any>): this;
    registerCommandHandler(descriptor: CommandHandlerDescriptor<any>): this;
    registerCommandHandler(filterOrDescriptor: CommandHandlerDescriptor<any> | CommandHandlerDescriptor.Filter<any>, handler?: CommandHandlerDescriptor.Func<any>): this {
        if (filterOrDescriptor instanceof CommandHandlerDescriptor) {
            this.commandHandlers.push(filterOrDescriptor);
        } else {
            this.commandHandlers.push(
                CommandHandlerDescriptor.fromFilter(filterOrDescriptor, handler!)
            );
        }
        return this;
    }

    registerCommandHandlers(descriptors: Array<CommandHandlerDescriptor<any>>): this {
        for (const descriptor of descriptors) {
            this.registerCommandHandler(descriptor);
        }
        return this;
    }

    /**
     * Dispatches command to the bus.
     */
    async handle(command: Command): Promise<any> {
        let currentMiddleware = 0;
        const next = async (command: Command): Promise<any> => {
            const middleware = this.middlewares[currentMiddleware++];

            if (middleware) {
                return middleware(command, next);
            }
            return this.runCommandHandler(command);
        };

        return next(command);
    }

    asCommandRunner(): CommandRunner {
        return this.handle.bind(this);
    }

    hasCommandHandler(command: Command) {
        return !!this.getCommandHandlerForCommand(command);
    }

    private runCommandHandler(command: Command) {
        const commandHandler = this.getCommandHandlerForCommand(command);
        if (!commandHandler) {
            throw new Error(`No command handler registered for command: ${command.command}`);
        }
        return commandHandler.func(command);
    }

    private getCommandHandlerForCommand(command: Command): CommandHandlerDescriptor | undefined {
        return this.commandHandlers.find(
            ({predicate}) => predicate(command)
        );
    }
}

export namespace CommandBus {
    export type Middleware<TCommand extends Command = Command> = (command: TCommand, next: (command: TCommand) => Promise<any>) => Promise<any> | any
}
