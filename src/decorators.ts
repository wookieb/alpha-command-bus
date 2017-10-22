import "reflect-metadata";
import {CommandHandlerFunc, CommandBus, CommandFilter, CommandPredicate} from "./CommandBus";
import {Command} from "./Command";

const COMMAND_METADATA = Symbol('alpha-command-bus');

export interface CommandHandlerObjectEntry {
    commandPredicate: CommandPredicate,
    commandHandler: (command: Command) => any
}

interface CommandBusClassMetadata {
    methods: { commandPredicate: CommandPredicate, method: string }[]
}

export function CommandHandler(commandFilter: CommandFilter) {
    return (target: any, method: string, descriptor: PropertyDescriptor) => {
        ensureMetadata(target).methods.push({
            commandPredicate: CommandBus.commandFilterToPredicate(commandFilter),
            method
        })
    }
}

function ensureMetadata(target: Function): CommandBusClassMetadata {
    if (Reflect.hasMetadata(COMMAND_METADATA, target)) {
        return Reflect.getMetadata(COMMAND_METADATA, target);
    }

    const metadata: CommandBusClassMetadata = {
        methods: []
    };
    Reflect.defineMetadata(COMMAND_METADATA, metadata, target);
    return metadata;
}

/**
 * Returns command handlers registered with decorator in given object
 */
export function getCommandHandlers(object: { [method: string]: any | CommandHandlerFunc }): CommandHandlerObjectEntry[] {
    const metadata: CommandBusClassMetadata = Reflect.getMetadata(COMMAND_METADATA, object);

    if (!metadata) {
        return [];
    }

    return metadata.methods.map((entry) => {
        const method = object[entry.method];
        if (!(method instanceof Function)) {
            throw new Error(`Property "${entry.method}" has to be a method`);
        }

        return {
            commandPredicate: entry.commandPredicate,
            commandHandler: method.bind(object)
        };
    });
}