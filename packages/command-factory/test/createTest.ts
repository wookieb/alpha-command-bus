import {create} from '@src/create';

describe('create', () => {
    const NAME = 'commandName';

    describe('creating command', () => {
        it('without extra properties', () => {
            const command = create(NAME);

            expect(command)
                .toEqual({
                    command: NAME
                });

            expect(Object.isFrozen(command))
                .toBeTruthy();
        });

        it('with extra properties', () => {
            const command = create(NAME, {arg: 1});

            expect(command)
                .toEqual({
                    command: NAME,
                    arg: 1
                });

            expect(Object.isFrozen(command))
                .toBeTruthy();
        });
    });
});
