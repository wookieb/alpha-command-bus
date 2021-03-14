import {ShapeCommand} from '@src/ShapeCommand';
import {BaseCommand} from '@src/BaseCommand';

describe('ShapeCommand', () => {
    const NAME = 'foooo';

    class Foo extends ShapeCommand.create(NAME) {
        constructor(readonly id: string) {
            super();
            this.freeze();
        }
    }

    it('properties', () => {
        expect(Foo.COMMAND_NAME)
            .toEqual(NAME);

        const command = new Foo('10');

        expect(command)
            .toMatchSnapshot();
    });


    describe('testing type', () => {
        class Bar extends BaseCommand {
            constructor() {
                super(NAME);
            }
        }

        class FooBar extends ShapeCommand.create('foobar') {
            constructor(readonly id: string) {
                super();
                this.freeze();
            }
        }

        it('simple', () => {
            expect(ShapeCommand.isType(Foo))
                .toEqual(true);

            expect(ShapeCommand.isType(FooBar))
                .toEqual(true);

            expect(ShapeCommand.isType(Bar))
                .toEqual(false);
        });

        it('with name', () => {
            expect(ShapeCommand.isTypeOfName(NAME, Foo))
                .toEqual(true);

            expect(ShapeCommand.isTypeOfName(NAME, FooBar))
                .toEqual(false);

            expect(ShapeCommand.isTypeOfName(NAME, Bar))
                .toEqual(false);
        });
    })
});
