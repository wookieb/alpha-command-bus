import CommandBus from "../src/CommandBus";
import {assert} from 'chai';
import {Command, createCommand} from "../src/Command";
import * as sinon from 'sinon';
import {SinonStub} from "sinon";

describe('CommandBus', () => {
    let commandBus: CommandBus;

    const COMMAND_NAME = 'commandName';
    const RESULT = {simple: 'result'};

    function assertMiddlewareCalled(middleware: SinonStub) {
        sinon.assert.calledWithMatch(
            middleware,
            sinon.match.has('command', COMMAND_NAME),
            sinon.match.func
        );
    }

    beforeEach(() => {
        commandBus = new CommandBus();

        commandBus.registerCommandHandler(COMMAND_NAME, () => {
            return RESULT;
        });
    });

    it('checking whether command has a handler', () => {
        assert.isTrue(commandBus.hasCommandHandler(COMMAND_NAME));
        assert.isFalse(commandBus.hasCommandHandler('test'));
    });

    describe('handling command', () => {
        it('simple command', async () => {
            const result = await commandBus.handle(createCommand(COMMAND_NAME));
            assert.strictEqual(result, RESULT);
        });

        it('fails if no command handler registered', () => {
            return assert.isRejected(
                commandBus.handle(createCommand('test')),
                /No command handler registered for command: test/
            );
        });
    });


    describe('middleware', () => {
        it('simple wrapper middleware', async () => {
            const middleware = sinon.stub()
                .callsFake((command: Command, next: Function) => {
                    return next();
                });

            commandBus.use(middleware);

            const result = await commandBus.handle(createCommand(COMMAND_NAME));
            assert.strictEqual(result, RESULT);

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
            commandBus.registerCommandHandler(COMMAND_NAME, commandHandler);

            const result = await commandBus.handle(createCommand(COMMAND_NAME));

            assert.strictEqual(result, MIDDLEWARE_RESULT);
            assertMiddlewareCalled(middleware);
            sinon.assert.notCalled(commandHandler);
        });
    });
});