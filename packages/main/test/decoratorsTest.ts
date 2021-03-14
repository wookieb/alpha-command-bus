import {CommandHandler, getCommandHandlersFromObject} from "@src/decorators";
import 'jest-extended';
import {ShapeCommand} from 'alpha-command-bus-command-factory';
import {Command} from 'alpha-command-bus-core';

class Foo extends ShapeCommand.create('foooo') {

}

class ExampleCommandsHandlerContainer {
    @CommandHandler('commandName')
    handler1(command: Command) {
        return 'handler1';
    }

    @CommandHandler('commandName2')
    handler2(command: Command) {
        return 'handler2';
    }

    @CommandHandler(Foo)
    handler3(command: Command) {
        return 'handler3'
    }
}

describe('decorators', () => {
    describe('getting command handlers', () => {

        it('success', () => {
            const container = new ExampleCommandsHandlerContainer();
            const handlers = getCommandHandlersFromObject(container);

            expect(handlers[0].func({command: 'commandName'}))
                .toBeTruthy();

            expect(handlers[1].func({command: 'commandName2'}))
                .toBeTruthy();

            expect(handlers[2].func({command: 'foooo'}))
                .toBeTruthy();

            expect(handlers.map(e => e.func({command: 'test'})))
                .toIncludeSameMembers(['handler1', 'handler2', 'handler3'])
        });

        it('throws an error if decorated property is not a function', () => {
            expect(() => {
                const container = new ExampleCommandsHandlerContainer();
                container.handler2 = 'test' as any;

                getCommandHandlersFromObject(container);
            })
                .toThrowError(/has to be a method/);
        });

        it('returns empty array if object has not handlers', () => {
            const handlers = getCommandHandlersFromObject({});
            expect(handlers)
                .toHaveLength(0);
        });
    });
});
