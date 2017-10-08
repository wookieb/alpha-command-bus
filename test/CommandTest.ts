import {createCommand} from "../src/Command";
import {assert} from 'chai';

describe('Command', () => {
    it('creating command', () => {
        const NAME = 'commandName';
        const command = createCommand(NAME, {arg: 1});

        assert.deepEqual(command, <any>{
            command: NAME,
            arg: 1
        });

        assert.isTrue(Object.isFrozen(command));
    });
});