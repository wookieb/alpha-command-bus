import {CommandHandlerDescriptor} from "@src/CommandHandlerDescriptor";
import * as sinon from 'sinon';

describe('CommandHandlerDescriptor', () => {
    const COMMAND_NAME = 'commandName';

    describe('filterToPredicate', () => {
        it('string as command name', () => {

            const predicate = CommandHandlerDescriptor.filterToPredicate(COMMAND_NAME);

            expect(predicate({command: COMMAND_NAME}))
                .toBeTruthy();

            expect(predicate({command: 'random'}))
                .toBeFalsy();
        });

        it('object as object match', () => {
            const predicate1 = CommandHandlerDescriptor.filterToPredicate({
                command: COMMAND_NAME,
                arg: 1
            });

            const predicate2 = CommandHandlerDescriptor.filterToPredicate({
                command: COMMAND_NAME
            });

            expect(predicate1({command: COMMAND_NAME, arg: 1}))
                .toBeTruthy();

            expect(predicate1({command: COMMAND_NAME, arg: 2}))
                .toBeFalsy();

            expect(predicate2({command: COMMAND_NAME, arg: 1}))
                .toBeTruthy();

            expect(predicate2({command: COMMAND_NAME, arg: 2}))
                .toBeTruthy();

            expect(predicate2({command: COMMAND_NAME}))
                .toBeTruthy();
        });

        it('predicate as command predicate', () => {
            const filter = sinon.stub().returns(true);

            const predicate = CommandHandlerDescriptor.filterToPredicate(filter);

            const command = {command: COMMAND_NAME};
            expect(predicate(command))
                .toBeTruthy();

            sinon.assert.calledWith(filter, command);
        });

        it('throws error if filter has invalid type', () => {
            expect(() => {
                CommandHandlerDescriptor.filterToPredicate(false as any)
            })
                .toThrowErrorMatchingSnapshot();
        });
    });

    it('creating from filter', () => {
        const predicate = sinon.stub().returns(true);
        const func = sinon.stub();
        const descriptor = CommandHandlerDescriptor.fromFilter(predicate, func);

        expect(descriptor)
            .toEqual(
                new CommandHandlerDescriptor(predicate, func)
            );
    });
});