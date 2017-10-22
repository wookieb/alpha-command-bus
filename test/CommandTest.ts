import {BaseCommand, createCommand} from "../src/Command";
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
        const command = new BaseCommand(NAME);

        assert.deepEqual(command, <any>{
            command: NAME
        });

        assert.isFalse(Object.isFrozen(command));

        command.freeze();

        assert.isTrue(Object.isFrozen(command));
    });
});

