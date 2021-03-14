import {BaseCommand} from '@src/BaseCommand';

it('Base command', () => {
    const NAME = 'commandName';

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
