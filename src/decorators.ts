import "reflect-metadata";
import {CommandHandlerFunc, CommandFilter, CommandPredicate} from "./CommandBus";
import {Command} from "./Command";

const COMMAND_METADATA = Symbol('alpha-command-bus');

export interface CommandHandlerObjectEntry {
    commandFilter: CommandFilter,
    commandHandler: (command: Command) => any
}

interface CommandBusClassMetadata {
    methods: { commandFilter: CommandFilter, method: string }[]
}

export function CommandHandler(commandFilter: CommandFilter) {
    return (target: any, method: string, descriptor: PropertyDescriptor) => {
        ensureMetadata(target).methods.push({
            commandFilter,
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
            commandFilter: entry.commandFilter,
            commandHandler: method.bind(object)
        };
    });
}