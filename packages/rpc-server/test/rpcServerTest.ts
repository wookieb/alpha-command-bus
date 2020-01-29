import {createRequest, createResponse, MockResponse} from 'node-mocks-http';
import {rpcServer, Options} from "@src/rpcServer";
import * as sinon from 'sinon';
import {CommandBus} from "alpha-command-bus";
import * as boom from '@hapi/boom';
import * as express from 'express';
import {DataNormalizer, JSONAdapter, Serializer} from "alpha-serializer";
import {RPCServerError} from "@src/RPCServerError";

describe('rpcServer', () => {

    let commandBus: sinon.SinonStubbedInstance<CommandBus>;
    let serializer: Serializer;
    const COMMAND = {command: 'example'};

    beforeEach(() => {
        commandBus = sinon.createStubInstance(CommandBus);

        serializer = new Serializer(
            new JSONAdapter(),
            new DataNormalizer()
        );

        serializer.normalizer.registerNormalization({
            clazz: Error,
            name: 'Error',
            normalizer(e) {
                return {message: e.message, name: e.name};
            }
        });

        serializer.normalizer.registerNormalization({
            clazz: RPCServerError,
            name: 'RPCServerError',
            normalizer(e) {
                return {message: e.message, name: e.name};
            }
        });
    });

    function rpc(options: Options = {serializer}) {
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
            const error = new RPCServerError('Missing body for command');

            const response = createResponse();
            const next = sinon.spy();

            await rpc()(request, response, next);

            assertNoErrorThrown(next);
            assertErrorResponse(response);
            expect(response._getData())
                .toEqual(serializer.serialize(error));
        });

        it('body cannot be deserialized', async () => {
            const request = createRequest({
                method: 'POST',
                url: '/',
                body: 'some body' as any
            });
            const error = new RPCServerError('Cannot deserialize body: Unexpected token s in JSON at position 0');

            const response = createResponse();
            const next = sinon.spy();

            await rpc()(request, response, next);

            assertNoErrorThrown(next);
            assertErrorResponse(response);
            expect(response._getData())
                .toEqual(serializer.serialize(error));
        });

        it('body cannot be denormalized', async () => {
            const request = createRequest({
                method: 'POST',
                url: '/',
                body: {
                    test: {'@type': 'test', value: 'data'}
                }
            });
            const error = new RPCServerError('Cannot deserialize body: Missing normalization for type test');

            const response = createResponse();
            const next = sinon.spy();

            await rpc()(request, response, next);

            assertNoErrorThrown(next);
            assertErrorResponse(response);
            expect(response._getData())
                .toEqual(serializer.serialize(error));
        });

        it('body does not look like command', async () => {
            const request = createRequest({
                method: 'POST',
                url: '/',
                body: {
                    test: 1
                }
            });
            const error = new RPCServerError('Request body does not look like a command object. Make sure you have sent proper command object');

            const response = createResponse();
            const next = sinon.spy();
            await rpc()(request, response, next);

            // then
            assertNoErrorThrown(next);
            assertErrorResponse(response);
            expect(response._getData())
                .toEqual(serializer.serialize(error));
        })
    });


    describe('success', () => {
        let server: ReturnType<typeof rpcServer>;
        beforeEach(() => {
            server = rpc({
                serializer
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
            const response = createResponse();
            const next = sinon.spy();

            commandBus.handle
                .withArgs(COMMAND)
                .rejects(error);

            // when
            await server(request, response, next);

            // then
            assertNoErrorThrown(next);
            assertErrorResponse(response);
            expect(response._getData())
                .toEqual(serializer.serialize(error));
        })
    });
});