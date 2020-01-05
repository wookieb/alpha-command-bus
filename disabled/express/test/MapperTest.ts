import {CommandBus} from 'alpha-command-bus';
import * as sinon from 'sinon';
import {Request, Response} from 'express';
import {Mapper} from '@src/Mapper';
import {createRequest, createResponse} from 'node-mocks-http';

const COMMAND = Object.freeze({command: 'someCommandName'});
const commandFactory = () => {
    return COMMAND;
};

describe('Mapper', () => {
    let commandBus: sinon.SinonStubbedInstance<CommandBus>;
    let request: sinon.SinonStubbedInstance<Request>;
    let response: sinon.SinonStubbedInstance<Response>;

    beforeEach(() => {
        commandBus = sinon.createStubInstance(CommandBus);

        request = new MockRequest();

        response = new MockResponse({
            request
        });

        sinon.stub(response, 'status').returns(response as any as Response);
        sinon.stub(response, 'send').returns(response as any as Response);
    });

    describe('result', () => {
        let result: any;
        beforeEach(() => {
            result = {some: 'extra', result: ':)'};
            commandBus.handle
                .withArgs(COMMAND)
                .returns(Promise.resolve(result));
        });

        it('by default sends to response just like this', async () => {
            const mapper = new Mapper(commandBus as any as CommandBus);

            await mapper.map(commandFactory)(request as any as Request, response as any as Response);

            sinon.assert.calledWithMatch(response.send, sinon.match.same(result));
        });

        it('uses object result handler if provided', async () => {
            const resultHandler = sinon.spy();
            const mapper = new Mapper(commandBus as any as CommandBus, {
                resultHandler
            });

            await mapper.map(commandFactory)(request as any as Request, response as any as Response);

            sinon.assert.calledWithMatch(
                resultHandler,
                sinon.match.same(result),
                sinon.match({
                    command: sinon.match.same(COMMAND),
                    request: sinon.match.same(request),
                    response: sinon.match.same(response)
                })
            );
        });

        it('uses local result handler if provided', async () => {
            const resultHandler = sinon.spy();
            const mapper = new Mapper(commandBus as any as CommandBus);

            await mapper.map(commandFactory, {resultHandler: resultHandler})(
                request as any as Request,
                response as any as Response
            );

            sinon.assert.calledWithMatch(
                resultHandler,
                sinon.match.same(result),
                sinon.match({
                    command: sinon.match.same(COMMAND),
                    request: sinon.match.same(request),
                    response: sinon.match.same(response)
                }),
                sinon.match.func
            );
        });

        it('users local result handler is provided and passes parent result handler reference', async () => {
            const resultHandler = sinon.spy();
            const parentResultHandler = sinon.spy();
            const mapper = new Mapper(commandBus as any as CommandBus, {
                resultHandler: parentResultHandler
            });

            await mapper.map(commandFactory, {resultHandler: resultHandler})(
                request as any as Request,
                response as any as Response
            );

            sinon.assert.calledWithMatch(
                resultHandler,
                sinon.match.same(result),
                sinon.match({
                    command: sinon.match.same(COMMAND),
                    request: sinon.match.same(request),
                    response: sinon.match.same(response)
                }),
                sinon.match.same(parentResultHandler)
            );
        })

    });

    describe('error', () => {

        let error: Error;
        beforeEach(() => {
            error = new Error('test');
            commandBus.handle
                .withArgs(COMMAND)
                .returns(Promise.reject(error));
        });

        it('by default sends 500 with error', async () => {
            const mapper = new Mapper(commandBus as any as CommandBus);

            await mapper.map(commandFactory)(request as any as Request, response as any as Response);

            sinon.assert.calledWith(response.status, 500);
            sinon.assert.calledWith(response.send, error);
        });

        it('uses object error handler if provided', async () => {
            const errorHandler = sinon.spy();
            const mapper = new Mapper(commandBus as any as CommandBus, {
                errorHandler
            });

            await mapper.map(commandFactory)(request as any as Request, response as any as Response);

            sinon.assert.calledWithMatch(
                errorHandler,
                sinon.match.same(error),
                sinon.match({
                    command: sinon.match.same(COMMAND),
                    request: sinon.match.same(request),
                    response: sinon.match.same(response)
                })
            );
        });

        it('uses local error handler if provided', async () => {
            const errorHandler = sinon.spy();
            const mapper = new Mapper(commandBus as any as CommandBus);

            await mapper.map(commandFactory, {errorHandler})(request as any as Request, response as any as Response);

            sinon.assert.calledWithMatch(
                errorHandler,
                sinon.match.same(error),
                sinon.match({
                    command: sinon.match.same(COMMAND),
                    request: sinon.match.same(request),
                    response: sinon.match.same(response)
                }),
                sinon.match.func
            );
        });

        it('users local error handler is provided and passes parent error handler reference', async () => {
            const errorHandler = sinon.spy();
            const parentErrorHandler = sinon.spy();
            const mapper = new Mapper(commandBus as any as CommandBus, {
                errorHandler: parentErrorHandler
            });

            await mapper.map(commandFactory, {errorHandler})(request as any as Request, response as any as Response);

            sinon.assert.calledWithMatch(
                errorHandler,
                sinon.match.same(error),
                sinon.match({
                    command: sinon.match.same(COMMAND),
                    request: sinon.match.same(request),
                    response: sinon.match.same(response)
                }),
                sinon.match.same(parentErrorHandler)
            );
        })
    })
});