import {Command} from 'alpha-command-bus-core';

export function create<T extends object = object>(name: string, extraProperties?: T): Readonly<Command & T> {
    // tslint:disable-next-line:no-object-literal-type-assertion
    return Object.freeze({
        command: name,
        ...(extraProperties || {}),
    } as Command & T);
}
