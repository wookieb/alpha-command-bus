import {BaseCommand, createCommand, createCommandFactory} from "../src/Command";
import {assert} from 'chai';
import * as sinon from 'sinon';

describe('Command', () => {
    const NAME = 'commandName';

    it('creating command', () => {

        const command = createCommand(NAME, {arg: 1});

        assert.deepEqual(command, <any>{
            command: NAME,
            arg: 1
        });

        assert.isTrue(Object.isFrozen(command));
    });

    it('Base command', () => {
        const command = new BaseCommand(NAME, {arg: 1});

        assert.deepEqual(command, <any>{
            command: NAME,
            arg: 1
        });

        assert.isTrue(Object.isFrozen(command));
    });

    it('command factory', () => {
        const commandFactory = createCommandFactory<{ prop: string }>(NAME);

        assert.strictEqual(commandFactory.command, NAME);

        assert.deepEqual(commandFactory({prop: 'test'}), {
            command: NAME,
            prop: 'test'
        });
    });

    it('command factory with onCreate callback', () => {
        const onCreate = sinon.spy();
        const commandFactory = createCommandFactory(NAME, onCreate);

        const input = {some: 'input', object: 'with data'};

        assert.deepEqual(commandFactory(input), {command: NAME, ...input});

        sinon.assert.calledWithExactly(
            onCreate,
            input,
            NAME
        );
    });
});

