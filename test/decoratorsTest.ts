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
            Array.from(handlers).map(e => [e[0], e[1]({command: 'test'})]),
            [
                ['commandName', 'handler1'],
                ['commandName2', 'handler2']
            ]
        );
    });
});