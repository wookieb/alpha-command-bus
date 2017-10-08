import "reflect-metadata";
import {CommandHandlerFunc} from "./CommandBus";

const COMMAND_METADATA = Symbol('alpha-command-bus');

interface CommandBusClassMetadata {
    methods: { commandName: string, method: string }[]
}

export function CommandHandler(commandName: string) {
    return (target: any, method: string, descriptor: PropertyDescriptor) => {
        ensureMetadata(target).methods.push({
            commandName,
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

export function getCommandHandlers(object: { [method: string]: any | CommandHandlerFunc }): Map<string, CommandHandlerFunc> {
    const metadata: CommandBusClassMetadata = Reflect.getMetadata(COMMAND_METADATA, object);

    const map = new Map();

    metadata.methods.forEach((entry) => {
        const method = object[entry.method];
        if (!(method instanceof Function)) {
            throw new Error(`Property "${entry.method}" has be a method`);
        }
        map.set(entry.commandName, method.bind(object));
    });
    return map;
}