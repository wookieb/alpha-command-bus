import {CommandBus} from "../src/CommandBus";
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
        assert.isTrue(commandBus.hasCommandHandler(createCommand(COMMAND_NAME)));
        assert.isFalse(commandBus.hasCommandHandler(createCommand('fake-command')));
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

    describe('command mapping', () => {
        let commandBus: CommandBus;
        beforeEach(() => {
            commandBus = new CommandBus();
        });

        it('simple command name', async () => {
            const commandBus = new CommandBus();
            commandBus.registerCommandHandler(COMMAND_NAME, () => RESULT);

            const result = await commandBus.handle(createCommand(COMMAND_NAME));
            assert.strictEqual(result, RESULT);
        });

        it('object matching', async () => {
            const PROPERTY = 'propertyValue';
            commandBus.registerCommandHandler({command: COMMAND_NAME, property: PROPERTY}, () => RESULT);
            const result = await commandBus.handle(createCommand(COMMAND_NAME, {property: PROPERTY}));
            assert.strictEqual(result, RESULT);
        });

        it('custom predicate', async () => {
            const PROPERTY = 'propertyValue';

            commandBus.registerCommandHandler((command: Command) => (<any>command).property === PROPERTY, () => RESULT);

            const result = await commandBus.handle(createCommand(COMMAND_NAME, {property: PROPERTY}));
            assert.strictEqual(result, RESULT);
        });

        it('throws an error if command name is not a function, string or an object', () => {
            assert.throws(() => {
                commandBus.registerCommandHandler(<any>true, () => RESULT)
            }, 'Command predicate has to be a function, a string or an object');
        });

        describe('multiple mappings at a time', () => {
            const COMMAND_1 = 'command1';
            const COMMAND_2 = 'command2';

            const HANDLER = (command: Command) => command.command;

            it('as an object', async () => {

                commandBus.registerCommandHandlers({
                    [COMMAND_1]: HANDLER,
                    [COMMAND_2]: HANDLER
                });

                assert.strictEqual(await commandBus.handle(createCommand(COMMAND_1)), COMMAND_1);
                assert.strictEqual(await commandBus.handle(createCommand(COMMAND_2)), COMMAND_2);
            });

            it('as a map', async () => {
                const mappings = new Map([
                    [
                        (c: Command) => c.command === COMMAND_1,
                        HANDLER
                    ],
                    [
                        (c: Command) => c.command === COMMAND_2,
                        HANDLER
                    ]
                ]);

                commandBus.registerCommandHandlers(mappings);
                assert.strictEqual(await commandBus.handle(createCommand(COMMAND_1)), COMMAND_1);
                assert.strictEqual(await commandBus.handle(createCommand(COMMAND_2)), COMMAND_2);
            })
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