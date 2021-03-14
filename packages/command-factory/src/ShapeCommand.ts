import {BaseCommand} from './BaseCommand';

export namespace ShapeCommand {
    export function create(name: string) {
        return class extends BaseCommand {
            static COMMAND_NAME = name;

            constructor() {
                super(name);
            }
        }
    }

    export interface Shape<TName extends string = string> {
        readonly COMMAND_NAME: TName,

        new(...args: any[]): any
    }

    export function isType(value: any): value is Shape {
        return value && 'COMMAND_NAME' in value;
    }

    export function isTypeOfName<TName extends string>(name: TName, value: any): value is Shape<TName> {
        return isType(value) && value.COMMAND_NAME === name;
    }
}
