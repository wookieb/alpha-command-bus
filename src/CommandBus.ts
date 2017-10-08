import {Command} from "./Command";


export type Middleware = (command: Command, next: () => Promise<any>) => Promise<any> | any
export type CommandHandlerFunc = (command: Command) => Promise<any> | any;

export default class CommandBus {

    private middlewares: Middleware[] = [];
    private commandHandlers: Map<string, CommandHandlerFunc> = new Map();

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
    registerCommandHandler(commandName: string, handler: CommandHandlerFunc): this {
        this.commandHandlers.set(commandName, handler);
        return this;
    }

    /**
     * Registers multiple command handlers at a time
     */
    registerCommandHandlers(commandHandlers: Map<string, CommandHandlerFunc> | { [commandName: string]: CommandHandlerFunc }) {
        if (commandHandlers instanceof Map) {
            for (const [commandName, commandHandler] of commandHandlers) {
                this.registerCommandHandler(commandName, commandHandler);
            }
        } else {
            for (const commandName in commandHandlers) {
                this.registerCommandHandler(commandName, commandHandlers[commandName]);
            }
        }
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

    /**
     * Checks whether given command name has registered a command handler
     */
    hasCommandHandler(commandName: string) {
        return this.commandHandlers.has(commandName);
    }

    private runCommandHandler(command: Command) {
        const commandHandler = this.commandHandlers.get(command.command);
        if (!commandHandler) {
            throw new Error(`No command handler registered for command: ${command.command}`);
        }

        return commandHandler(command);
    }
}