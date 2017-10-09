export interface Command {
    command: string;
}

export function createCommand<T extends object = object>(commandName: string, extraProperties?: T): Readonly<Command & T> {
    return Object.freeze(Object.assign({}, extraProperties, {command: commandName}));
}

export class BaseCommand implements Command {
    constructor(public readonly command: string, extraProperties?: { [key: string]: any }) {
        Object.assign(this, {command}, extraProperties);
        Object.freeze(this);
    }
}