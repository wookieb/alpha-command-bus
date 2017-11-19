import {CommandBus} from 'alpha-command-bus';
import {assert} from 'chai';
import {Mapper} from "../src/Mapper";
import * as sinon from 'sinon';
import {SinonStub} from "sinon";
import {Request, Response} from 'express';

const MockRequest = require('mock-express-request');
const MockResponse = require('mock-express-response');


const COMMAND = Object.freeze({command: 'someCommandName'});
const commandFactory = () => {
    return COMMAND;
};

describe('Mapper', () => {

    let commandBus: CommandBus;
    let request: Request;
    let response: Response;

    beforeEach(() => {
        commandBus = sinon.createStubInstance(CommandBus);

        request = new MockRequest();

        response = new MockResponse({
            request
        });

        sinon.stub(response, 'status').returns(response);
        sinon.stub(response, 'send').returns(response);
    });

    describe('constructor', () => {
        it('requires commandBus to be defined', () => {
            assert.throws(() => {
                new Mapper(undefined);
            }, /command bus must be defined/);
        });

        it('requires commandBus to be an instance of CommandBus', () => {
            assert.throws(() => {
                new Mapper(<CommandBus>{});
            }, /be an instance of CommandBus/);
        })
    });

    describe('result', () => {

        let result: any;
        beforeEach(() => {
            result = {some: 'extra', result: ':)'};
            (<SinonStub>commandBus.handle)
                .withArgs(COMMAND)
                .returns(Promise.resolve(result));
        });

        it('by default sends to response just like this', async () => {
            const mapper = new Mapper(commandBus);

            await mapper.map(commandFactory)(request, response);

            sinon.assert.calledWithMatch(<SinonStub>response.send, sinon.match.same(result));
        });

        it('uses object result handler if provided', async () => {
            const resultHandler = sinon.spy();
            const mapper = new Mapper(commandBus, {
                resultHandler
            });

            await mapper.map(commandFactory)(request, response);

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
            const mapper = new Mapper(commandBus);

            await mapper.map(commandFactory, {resultHandler: resultHandler})(request, response);

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
            const mapper = new Mapper(commandBus, {
                resultHandler: parentResultHandler
            });

            await mapper.map(commandFactory, {resultHandler: resultHandler})(request, response);

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
            (<SinonStub>commandBus.handle)
                .withArgs(COMMAND)
                .returns(Promise.reject(error));
        });

        it('by default sends 500 with error', async () => {
            const mapper = new Mapper(commandBus);

            await mapper.map(commandFactory)(request, response);

            sinon.assert.calledWith(<SinonStub>response.status, 500);
            sinon.assert.calledWith(<SinonStub>response.send, error);
        });

        it('uses object error handler if provided', async () => {
            const errorHandler = sinon.spy();
            const mapper = new Mapper(commandBus, {
                errorHandler
            });

            await mapper.map(commandFactory)(request, response);

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
            const mapper = new Mapper(commandBus);

            await mapper.map(commandFactory, {errorHandler})(request, response);

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
            const mapper = new Mapper(commandBus, {
                errorHandler: parentErrorHandler
            });

            await mapper.map(commandFactory, {errorHandler})(request, response);

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