import {Command} from "@src/Command";

describe('Command', () => {
    const NAME = 'commandName';

    describe('creating command', () => {
        it('without extra properties', () => {
            const command = Command.create(NAME);

            expect(command)
                .toEqual({
                    command: NAME
                });

            expect(Object.isFrozen(command))
                .toBeTruthy();
        });

        it('with extra properties', () => {
            const command = Command.create(NAME, {arg: 1});

            expect(command)
                .toEqual({
                    command: NAME,
                    arg: 1
                });

            expect(Object.isFrozen(command))
                .toBeTruthy();
        });
    });

    it('Base command', () => {
        const command = new Command.Base(NAME);

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

