import {CommandBus} from "@src/CommandBus";
import {Command} from "@src/Command";
import * as sinon from 'sinon';
import {CommandHandlerDescriptor} from "@src/CommandHandlerDescriptor";

describe('CommandBus', () => {
    let commandBus: CommandBus;

    const COMMAND_NAME = 'commandName';
    const RESULT = {simple: 'result'};

    function assertMiddlewareCalled(middleware: sinon.SinonStub) {
        sinon.assert.calledWithMatch(
            middleware,
            sinon.match.has('command', COMMAND_NAME),
            sinon.match.func
        );
    }

    beforeEach(() => {
        commandBus = new CommandBus();

        commandBus.registerCommandHandler(
            CommandHandlerDescriptor.fromFilter(COMMAND_NAME, () => {
                return RESULT;
            })
        );
    });

    describe('registering command handler', () => {

        const COMMAND_NAME = 'randomCommandName';
        const COMMAND_NAME2 = 'randomCommandName2';

        it('single', () => {
            expect(commandBus.hasCommandHandler(Command.create(COMMAND_NAME)))
                .toBeFalsy();
            commandBus.registerCommandHandler(
                CommandHandlerDescriptor.fromFilter(COMMAND_NAME, sinon.stub())
            );
            expect(commandBus.hasCommandHandler(Command.create(COMMAND_NAME)))
                .toBeTruthy();
        });

        it('multi', () => {
            expect(commandBus.hasCommandHandler(Command.create(COMMAND_NAME)))
                .toBeFalsy();
            expect(commandBus.hasCommandHandler(Command.create(COMMAND_NAME2)))
                .toBeFalsy();

            commandBus.registerCommandHandlers([
                CommandHandlerDescriptor.fromFilter(COMMAND_NAME, sinon.stub()),
                CommandHandlerDescriptor.fromFilter(COMMAND_NAME2, sinon.stub()),
            ]);
            expect(commandBus.hasCommandHandler(Command.create(COMMAND_NAME)))
                .toBeTruthy();
            expect(commandBus.hasCommandHandler(Command.create(COMMAND_NAME2)))
                .toBeTruthy();
        });
    });

    describe('handling command', () => {
        it('simple command', async () => {
            const result = await commandBus.handle(Command.create(COMMAND_NAME));
            expect(result)
                .toStrictEqual(RESULT);
        });

        it('fails if no command handler registered', () => {
            return expect(commandBus.handle(Command.create('test')))
                .rejects
                .toThrowError(/No command handler registered for command: test/)
        });
    });

    describe('middleware', () => {
        it('simple wrapper middleware', async () => {
            const middleware = sinon.stub()
                .callsFake((command: Command, next: Function) => {
                    return next(command);
                });

            commandBus.use(middleware);

            const result = await commandBus.handle(Command.create(COMMAND_NAME));
            expect(result).toStrictEqual(RESULT);

            assertMiddlewareCalled(middleware);
        });

        it('middleware can prevent command from being handled', async () => {
            const MIDDLEWARE_RESULT = {middleware: 'result'};
            const middleware = sinon.stub()
                .callsFake(() => {
                    return MIDDLEWARE_RESULT;
                });

            commandBus.use(middleware);

            const commandHandler = sinon.spy();
            commandBus.registerCommandHandler(CommandHandlerDescriptor.fromFilter(COMMAND_NAME, commandHandler));

            const result = await commandBus.handle(Command.create(COMMAND_NAME));

            expect(result).toStrictEqual(MIDDLEWARE_RESULT);
            assertMiddlewareCalled(middleware);
            sinon.assert.notCalled(commandHandler);
        });
    });
});