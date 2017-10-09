import "reflect-metadata";
import {CommandHandlerFunc, CommandMapper, CommandPredicate} from "./CommandBus";

const COMMAND_METADATA = Symbol('alpha-command-bus');

interface CommandBusClassMetadata {
    methods: { commandName: CommandMapper, method: string }[]
}

export function CommandHandler(command: CommandMapper) {
    return (target: any, method: string, descriptor: PropertyDescriptor) => {
        ensureMetadata(target).methods.push({
            commandName: command,
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
export function getCommandHandlers(object: { [method: string]: any | CommandHandlerFunc }): Map<CommandMapper, CommandHandlerFunc> {
    const metadata: CommandBusClassMetadata = Reflect.getMetadata(COMMAND_METADATA, object);

    const map = new Map();

    metadata.methods.forEach((entry) => {
        const method = object[entry.method];
        if (!(method instanceof Function)) {
            throw new Error(`Property "${entry.method}" has to be a method`);
        }
        map.set(entry.commandName, method.bind(object));
    });
    return map;
}