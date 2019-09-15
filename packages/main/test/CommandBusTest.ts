import {CommandBus} from "@src/CommandBus";
import {Command, createCommand} from "@src/Command";
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
        expect(commandBus.hasCommandHandler(createCommand(COMMAND_NAME)))
            .toBeTruthy();

        expect(commandBus.hasCommandHandler(createCommand('fake-command')))
            .toBeFalsy();
    });


    describe('handling command', () => {
        it('simple command', async () => {
            const result = await commandBus.handle(createCommand(COMMAND_NAME));
            expect(result)
                .toStrictEqual(RESULT);
        });

        it('fails if no command handler registered', () => {
            return expect(commandBus.handle(createCommand('test')))
                .rejects
                .toThrowError(/No command handler registered for command: test/)
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

            expect(await commandBus.handle(createCommand(COMMAND_NAME)))
                .toStrictEqual(RESULT);
        });

        it('object matching', async () => {
            const PROPERTY = 'propertyValue';
            commandBus.registerCommandHandler({command: COMMAND_NAME, property: PROPERTY}, () => RESULT);
            const result = await commandBus.handle(createCommand(COMMAND_NAME, {property: PROPERTY}));
            expect(result).toStrictEqual(RESULT);
        });

        it('custom predicate', async () => {
            const PROPERTY = 'propertyValue';

            commandBus.registerCommandHandler((command: Command) => (<any>command).property === PROPERTY, () => RESULT);

            const result = await commandBus.handle(createCommand(COMMAND_NAME, {property: PROPERTY}));
            expect(result).toStrictEqual(RESULT);
        });

        it('throws an error if command name is not a function, string or an object', () => {
            expect(() => {
                commandBus.registerCommandHandler(<any>true, () => RESULT)
            }).toThrowError('Command predicate has to be a function, a string or an object');
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

                expect(await commandBus.handle(createCommand(COMMAND_1))).toStrictEqual(COMMAND_1);
                expect(await commandBus.handle(createCommand(COMMAND_2))).toStrictEqual(COMMAND_2);
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
                expect(await commandBus.handle(createCommand(COMMAND_1))).toStrictEqual(COMMAND_1);
                expect(await commandBus.handle(createCommand(COMMAND_2))).toStrictEqual(COMMAND_2);
            })
        });
    });


    describe('middleware', () => {
        it('simple wrapper middleware', async () => {
            const middleware = sinon.stub()
                .callsFake((command: Command, next: Function) => {
                    return next(command);
                });

            commandBus.use(middleware);

            const result = await commandBus.handle(createCommand(COMMAND_NAME));
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
            commandBus.registerCommandHandler(COMMAND_NAME, commandHandler);

            const result = await commandBus.handle(createCommand(COMMAND_NAME));

            expect(result).toStrictEqual(MIDDLEWARE_RESULT);
            assertMiddlewareCalled(middleware);
            sinon.assert.notCalled(commandHandler);
        });
    });
});