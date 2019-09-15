import {createRequest, createResponse, MockResponse} from 'node-mocks-http';
import {rpcServer, Options} from "@src/rpcServer";
import * as sinon from 'sinon';
import {CommandBus} from "alpha-command-bus";
import * as boom from '@hapi/boom';
import * as express from 'express';
import {DataNormalizer, Serializer} from "alpha-serializer";

describe('rpcServer', () => {

    let commandBus: sinon.SinonStubbedInstance<CommandBus>;

    const COMMAND = {command: 'example'};

    beforeEach(() => {
        commandBus = sinon.createStubInstance(CommandBus);
    });

    function rpc(options: Options = {}) {
        return rpcServer(commandBus as any, options);
    }

    function assertSuccessResponse(response: MockResponse<express.Response>) {
        expect(response.header('Content-Type'))
            .toEqual('application/json');
        expect(response.header('X-command-bus-error'))
            .toBeUndefined();
        expect(response)
            .toHaveProperty('statusCode', 200);
    }

    function assertErrorResponse(response: MockResponse<express.Response>) {
        expect(response.header('Content-Type'))
            .toEqual('application/json');
        expect(response.header('X-command-bus-error'))
            .toEqual('1');
        expect(response)
            .toHaveProperty('statusCode', 200);
    }

    function assertNoErrorThrown(next: sinon.SinonSpy) {
        sinon.assert.notCalled(next);
    }

    describe('throws error if', () => {

        afterEach(() => {
            sinon.assert.notCalled(commandBus.handle);
        });

        it('request body is missing', async () => {
            const request = createRequest({
                method: 'GET',
                url: '/'
            });

            const response = createResponse();
            const next = sinon.spy();

            await rpc()(request, response, next);

            sinon.assert.calledWithMatch(next, sinon.match({
                message: 'Missing body for command',
                isBoom: true,
                typeof: boom.badRequest
            }));
        });

        it('body cannot be deserialized', async () => {
            const request = createRequest({
                method: 'POST',
                url: '/',
                body: 'some body' as any
            });

            const response = createResponse();
            const next = sinon.spy();

            await rpc()(request, response, next);

            sinon.assert.calledWithMatch(next, sinon.match({
                message: sinon.match(/^Cannot deserialize body.*/),
                isBoom: true,
                typeof: boom.badRequest
            }));
        });

        it('body cannot be denormalized', async () => {
            const request = createRequest({
                method: 'POST',
                url: '/',
                body: {
                    test: {'@type': 'test', value: 'data'}
                }
            });

            const response = createResponse();
            const next = sinon.spy();

            await rpc()(request, response, next);

            sinon.assert.calledWithMatch(next, sinon.match({
                message: sinon.match(/^Cannot deserialize body.*/),
                isBoom: true,
                typeof: boom.badRequest
            }));
        });

        it('body does not look like command', async () => {
            const request = createRequest({
                method: 'POST',
                url: '/',
                body: {
                    test: 1
                }
            });

            const response = createResponse();
            const next = sinon.spy();

            await rpc()(request, response, next);

            sinon.assert.calledWithMatch(next, sinon.match({
                message: 'Request body does not look like a command object. Make sure you have sent proper command object',
                isBoom: true,
                typeof: boom.badRequest
            }));
        })
    });


    describe('success', () => {

        let serializer: sinon.SinonStubbedInstance<Serializer>;

        let server: ReturnType<typeof rpcServer>;

        beforeEach(() => {
            serializer = sinon.createStubInstance(Serializer);

            const normalizer = sinon.createStubInstance(DataNormalizer);
            normalizer.normalize.returnsArg(0);
            normalizer.denormalize.returnsArg(0);

            serializer.normalizer = normalizer as any as DataNormalizer;

            server = rpc({
                serializer: serializer as any as Serializer
            });
        });

        it('regular result', async () => {
            // given
            const request = createRequest({
                method: 'POST',
                url: '/',
                body: COMMAND
            });

            const result = {example: 'result'};
            const serializedResult = JSON.stringify(result);
            const response = createResponse();
            const next = sinon.spy();

            commandBus.handle
                .withArgs(COMMAND)
                .resolves(result);

            serializer.serialize
                .withArgs(result)
                .returns(serializedResult);

            // when
            await server(request, response, next);

            // then
            assertNoErrorThrown(next);
            assertSuccessResponse(response);
            expect(response._getData())
                .toEqual(serializedResult);
        });

        it('error thrown', async () => {
            // given
            const request = createRequest({
                method: 'POST',
                url: '/',
                body: COMMAND
            });

            const error = new Error('Example error');
            const serializedError = JSON.stringify({error: 'message'});
            const response = createResponse();
            const next = sinon.spy();

            commandBus.handle
                .withArgs(COMMAND)
                .rejects(error);

            serializer.serialize
                .withArgs(error)
                .returns(serializedError);

            // when
            await server(request, response, next);

            // then
            assertNoErrorThrown(next);
            assertErrorResponse(response);
            expect(response._getData())
                .toEqual(serializedError);
        })
    });
});