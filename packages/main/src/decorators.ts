import "reflect-metadata";
import {CommandHandlerDescriptor} from "./CommandHandlerDescriptor";
import * as is from 'predicates';

const COMMAND_METADATA = Symbol('alpha-command-bus');

interface Reference {
    predicate: CommandHandlerDescriptor.Predicate<any>;
    methodName: string;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function CommandHandler(filter: CommandHandlerDescriptor.Filter<any>) {
    return (target: any, methodName: string, descriptor: PropertyDescriptor) => {
        ensureMetadata(target).push({
            predicate: CommandHandlerDescriptor.filterToPredicate(filter),
            methodName
        });
    }
}

function ensureMetadata(target: Function): Reference[] {
    if (Reflect.hasMetadata(COMMAND_METADATA, target)) {
        return Reflect.getMetadata(COMMAND_METADATA, target);
    }
    const metadata: Reference[] = [];
    Reflect.defineMetadata(COMMAND_METADATA, metadata, target);
    return metadata;
}

/**
 * Returns command handlers registered with decorator in given object
 */
export function getCommandHandlersFromObject(object: { [method: string]: any }): CommandHandlerDescriptor[] {
    const references: Reference[] = Reflect.getMetadata(COMMAND_METADATA, object);

    if (!references || references.length === 0) {
        return [];
    }

    return references.map(entry => {
        const method = object[entry.methodName];
        is.assert(Function, `Property "${entry.methodName}" has to be a method`)(method);

        return new CommandHandlerDescriptor(
            entry.predicate,
            method.bind(object)
        );
    });
}
