import {Command} from 'alpha-command-bus-core';
import {ShapeCommand} from 'alpha-command-bus-command-factory/src/ShapeCommand';

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
        if (typeof filter === 'string') {
            const commandName = filter;
            return (c: Command) => c.command === commandName;
        }

        if (ShapeCommand.isType(filter)) {
            return (c: Command) => c.command === filter.COMMAND_NAME;
        }

        if (filter instanceof Function) {
            return filter as CommandHandlerDescriptor.Predicate<any>;
        }

        if (typeof filter === 'object') {
            return matchesObject(filter) as CommandHandlerDescriptor.Predicate<any>;
        }

        throw new Error('Command predicate has to be a function, a string, an object or class or ShapeCommand.Shape')
    }
}

export namespace CommandHandlerDescriptor {
    export type Predicate<TCommand extends Command> = (command: TCommand) => boolean;

    export type Func<TCommand extends Command, TResult = any> = (command: TCommand) => Promise<TResult> | TResult;

    export type Filter<TCommand extends Command> = string | object | Predicate<TCommand> | ShapeCommand.Shape;
}
