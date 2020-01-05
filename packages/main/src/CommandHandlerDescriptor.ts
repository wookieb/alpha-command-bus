import {Command} from "./Command";

const matchesObject = require('lodash.matches');


export class CommandHandlerDescriptor<TCommand extends Command = Command> {
    constructor(readonly predicate: CommandHandlerDescriptor.Predicate<TCommand>,
                readonly func: CommandHandlerDescriptor.Func<TCommand>) {
        Object.freeze(this);
    }

    static fromFilter<TCommand extends Command = Command>(filter: CommandHandlerDescriptor.Filter<TCommand>,
                                                          func: CommandHandlerDescriptor.Func<TCommand>) {
        return new CommandHandlerDescriptor<TCommand>(
            CommandHandlerDescriptor.filterToPredicate(filter),
            func
        );
    }

    static filterToPredicate(filter: CommandHandlerDescriptor.Filter<any>): CommandHandlerDescriptor.Predicate<any> {
        switch (true) {
            case typeof filter === 'string':
                const commandName = filter;
                return (c: Command) => c.command === commandName;

            case typeof filter === 'object':
                return matchesObject(filter) as CommandHandlerDescriptor.Predicate<any>;

            case filter instanceof Function:
                return filter as CommandHandlerDescriptor.Predicate<any>;

            default:
                throw new Error('Command predicate has to be a function, a string or an object');
        }
    }
}

export namespace CommandHandlerDescriptor {
    export type Predicate<TCommand extends Command> = (command: TCommand) => boolean;

    export type Func<TCommand extends Command, TResult = any> = (command: TCommand) => Promise<TResult> | TResult;

    export type Filter<TCommand extends Command> = string | object | Predicate<TCommand>;
}