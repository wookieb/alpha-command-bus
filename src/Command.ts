export interface Command {
    command: string;
}

export function createCommand(commandName: string, extraProperties?: object): Command {
    return Object.freeze({...extraProperties, command: commandName});
}

export class BaseCommand implements Command {
    constructor(public readonly command: string, extraProperties?: { [key: string]: any }) {
        Object.freeze(this);
    }
}