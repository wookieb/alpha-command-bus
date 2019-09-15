import {BaseCommand, createCommand} from "@src/Command";
import * as sinon from 'sinon';

describe('Command', () => {
    const NAME = 'commandName';

    it('creating command', () => {

        const command = createCommand(NAME, {arg: 1});

        expect(command)
            .toEqual({
                command: NAME,
                arg: 1
            });

        expect(Object.isFrozen(command))
            .toBeTruthy();
    });

    it('Base command', () => {
        const command = new BaseCommand(NAME);

        expect(command)
            .toEqual({
                command: NAME
            });

        expect(Object.isFrozen(command))
            .toBeFalsy();

        command.freeze();

        expect(Object.isFrozen(command))
            .toBeTruthy();
    });
});

