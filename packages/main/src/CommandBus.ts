import {Command} from "./Command";

const matchesObject = require('lodash.matches');

export type Middleware = (command: Command, next: (command: Command) => Promise<any>) => Promise<any> | any
export type CommandHandlerFunc = (command: Command) => Promise<any> | any;
export type CommandPredicate = (command: Command) => boolean;

/**
 * Possible input types for command mapping: CommandFilter => CommandHandlerFunc
 */
export type CommandFilter = string | object | CommandPredicate;

type CommandHandlerMappingTuple = [CommandPredicate, CommandHandlerFunc];

export class CommandBus {

    private middlewares: Middleware[] = [];
    private commandHandlers: CommandHandlerMappingTuple[] = [];

    /**
     * Registers middleware that wraps process of handling a command
     */
    use(middleware: Middleware): this {
        this.middlewares.push(middleware);
        return this;
    }

    /**
     * Register command handler - a function responsible for handling a command
     */
    registerCommandHandler(command: CommandFilter, handler: CommandHandlerFunc): this {

        const commandPredicate = CommandBus.commandFilterToPredicate(command);
        this.commandHandlers.push([commandPredicate, handler]);
        return this;
    }

    static commandFilterToPredicate(commandFilter: CommandFilter): CommandPredicate {
        switch (true) {
            case typeof commandFilter === 'string':
                const commandName = commandFilter;
                return (c: Command) => c.command === commandName;

            case typeof commandFilter === 'object':
                return <CommandPredicate>matchesObject(commandFilter);

            case commandFilter instanceof Function:
                return <CommandPredicate>commandFilter;

            default:
                throw new Error('Command predicate has to be a function, a string or an object');
        }
    }

    /**
     * Registers multiple command handlers at a time
     */
    registerCommandHandlers(commandHandlers: Map<CommandFilter, CommandHandlerFunc> | { [commandName: string]: CommandHandlerFunc }): this {
        if (commandHandlers instanceof Map) {
            for (const [commandName, commandHandler] of commandHandlers) {
                this.registerCommandHandler(commandName, commandHandler);
            }
        } else {
            for (const commandName in commandHandlers) {
                this.registerCommandHandler(commandName, commandHandlers[commandName]);
            }
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
            } else {
                return this.runCommandHandler(command);
            }
        };

        return await next(command);
    }


    hasCommandHandler(command: Command) {
        return !!this.getCommandHandlerMapping(command);
    }

    private runCommandHandler(command: Command) {
        const commandHandlerMapping = this.getCommandHandlerMapping(command);
        if (!commandHandlerMapping) {
            throw new Error(`No command handler registered for command: ${command.command}`);
        }

        return commandHandlerMapping[1](command);
    }

    private getCommandHandlerMapping(command: Command) {
        return this.commandHandlers.find(
            ([predicate]: CommandHandlerMappingTuple) => predicate(command)
        );
    }
}