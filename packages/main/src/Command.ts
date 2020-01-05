export interface Command {
    command: string
}

export namespace Command {
    /**
     * Simple helper to create immutable commands
     */
    export function create<T extends object = object>(name: string, extraProperties?: T): Readonly<Command & T> {
        // tslint:disable-next-line:no-object-literal-type-assertion
        return Object.freeze({
            command: name,
            ...(extraProperties || {}),
        } as Command & T);
    }

    export class Base implements Command {
        constructor(readonly command: string) {
        }

        freeze() {
            Object.freeze(this);
        }
    }
}