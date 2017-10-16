export interface Command {
    command: string;
}

/**
 * Simple helper to create immutable commands
 */
export function createCommand<T extends object = object>(commandName: string, extraProperties?: T): Readonly<Command & T> {
    return Object.freeze(Object.assign({}, extraProperties, {command: commandName}));
}

/**
 * Very basic helper class if you want to create Commands using classes.
 * Simply extend it and provide proper arguments in constructor.
 */
export class BaseCommand implements Command {
    constructor(public readonly command: string, extraProperties?: { [key: string]: any }) {
        Object.assign(this, {command}, extraProperties);
        Object.freeze(this);
    }
}

export interface CommandFactory<T> {
    (input: T): Readonly<Command & T>;

    command: string;
}

/**
 * Helper method to create command factory.
 *
 * Returned factory is a wrapper to "createCommand" helper and passes all provided arguments
 *
 * @param name command name
 * @param onCreate function called on command creation
 */
export function createCommandFactory<T extends object>(name: string, onCreate?: (input: T, name: string) => any): CommandFactory<T> {
    const func = <CommandFactory<T>>function (input: T) {
        onCreate && onCreate(input, name);
        return createCommand(name, input);
    };
    func.command = name;
    return func;
}