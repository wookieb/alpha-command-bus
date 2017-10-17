export interface Command {
    command: string
}

/**
 * Simple helper to create immutable commands
 */
export function createCommand<T extends object = object>(commandName: string, extraProperties?: T): Readonly<Command & T> {
    return Object.freeze(Object.assign({}, extraProperties, {command: commandName}));
}

/**
 * Very basic helper class if you want to create Commands using classes.
 */
export class BaseCommand implements Command {
    constructor(public readonly command: string) {

    }

    freeze() {
        Object.freeze(this);
    }
}