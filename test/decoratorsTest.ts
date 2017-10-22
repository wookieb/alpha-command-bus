import {CommandHandler, getCommandHandlers} from "../src/decorators";
import {Command} from "../src/Command";

import {assert} from 'chai';

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


        assert.sameDeepMembers(
            handlers.map(e => {
                return [e.commandFilter, e.commandHandler({command: 'test'})]
            }),
            [
                ['commandName', 'handler1'],
                ['commandName2', 'handler2']
            ]
        );
    });

    it('throws an error if decorated property is not a function', () => {
        assert.throws(() => {
            const container = new ExampleCommandsHandlerContainer();
            container.handler2 = <any>'test';

            getCommandHandlers(container);
        }, /has to be a method/);
    })
});