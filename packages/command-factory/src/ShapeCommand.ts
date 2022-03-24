import {BaseCommand} from './BaseCommand';

export namespace ShapeCommand {
    export function create(name: string) {
        return class extends BaseCommand {
            static COMMAND_NAME = name;
            static commandName = name;

            constructor() {
                super(name);
            }
        }
    }

    export interface Shape<TName extends string = string> {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        readonly COMMAND_NAME: TName,
        readonly commandName: TName;

        new(...args: any[]): any
    }

    export function isType(value: any): value is Shape {
        return value && 'COMMAND_NAME' in value;
    }

    export function isTypeOfName<TName extends string>(name: TName, value: any): value is Shape<TName> {
        return isType(value) && value.COMMAND_NAME === name;
    }
}
