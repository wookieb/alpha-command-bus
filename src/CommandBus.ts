import {Command} from "./Command";

const matchesObject = require('lodash.matches');
const find = require('array-find');

export type Middleware = (command: Command, next: () => Promise<any>) => Promise<any> | any
export type CommandHandlerFunc = (command: Command) => Promise<any> | any;
export type CommandPredicate = (command: Command) => boolean;

/**
 * Possible input types for command mapping: CommandMapper => CommandHandlerFunc
 */
export type CommandMapper = string | object | CommandPredicate;

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
    registerCommandHandler(command: CommandMapper, handler: CommandHandlerFunc): this {

        switch (true) {
            case typeof command === 'string':
                const commandName = command;
                command = (c: Command) => c.command === commandName;
                break;

            case typeof command === 'object':
                command = <CommandPredicate>matchesObject(command);
                break;

            case command instanceof Function:
                // leave it as it is
                break;

            default:
                throw new Error('Command predicate has to be a function, a string or an object');

        }
        this.commandHandlers.push([<CommandPredicate>command, handler]);
        return this;
    }

    /**
     * Registers multiple command handlers at a time
     */
    registerCommandHandlers(commandHandlers: Map<CommandMapper, CommandHandlerFunc> | { [commandName: string]: CommandHandlerFunc }): this {
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
        const next = async (): Promise<any> => {
            const middleware = this.middlewares[currentMiddleware++];

            if (middleware) {
                return middleware(command, next);
            } else {
                return this.runCommandHandler(command);
            }
        };

        return await next();
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
        return find(
            this.commandHandlers,
            ([predicate]: CommandHandlerMappingTuple) => predicate(command)
        );
    }
}