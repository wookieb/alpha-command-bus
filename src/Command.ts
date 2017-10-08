export interface Command {
    command: string;
}

export function createCommand(commandName: string, extraProperties?: object): Command {
    return Object.freeze({...extraProperties, command: commandName});
}