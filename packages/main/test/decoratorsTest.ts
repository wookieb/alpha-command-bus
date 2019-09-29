import {CommandHandler, getCommandHandlers} from "@src/decorators";
import {Command} from "@src/Command";
import 'jest-extended';

class ExampleCommandsHandlerContainer {
    @CommandHandler('commandName')
    handler1(command: Command) {
        return 'handler1';
    }

    @CommandHandler('commandName2')
    handler2(command: Command) {
        return 'handler2';
    }
}

describe('decorators', () => {
    it('getting command handlers', () => {
        const container = new ExampleCommandsHandlerContainer();
        const handlers = getCommandHandlers(container);


        expect(handlers[0].commandPredicate({command: 'commandName'}))
            .toBeTruthy();

        expect(handlers[1].commandPredicate({command: 'commandName2'}))
            .toBeTruthy();

        expect(handlers.map(e => e.commandHandler({command: 'test'})))
            .toIncludeSameMembers(['handler1', 'handler2'])
    });

    it('throws an error if decorated property is not a function', () => {
        expect(() => {
            const container = new ExampleCommandsHandlerContainer();
            container.handler2 = 'test' as any;

            getCommandHandlers(container);
        })
            .toThrowError(/has to be a method/);
    });
});