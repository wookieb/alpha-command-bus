import nock = require('nock');
import {Serializer} from "alpha-serializer";
import {Client} from "@src/Client";
import {Middleware} from "@src/Middleware";
import {Headers} from 'node-fetch';
import * as sinon from 'sinon';

describe('Client', () => {

    let serverStub: nock.Scope;
    let client: Client;
    let serializer: sinon.SinonStubbedInstance<Serializer>;

    const COMMAND = {command: 'example', arg1: 'test'};
    const RESULT = {some: 'result'};
    const ERROR = new Error('test');

    beforeEach(() => {

        client = new Client('http://command-bus-server-http', serializer as any as Serializer);
        serverStub = nock('http://command-bus-server-http');
        serializer = sinon.createStubInstance(Serializer);

        serializer.serialize
            .withArgs(COMMAND)
            .returns(JSON.stringify(COMMAND));

        serializer.deserialize
            .withArgs(JSON.stringify(COMMAND))
            .returns(COMMAND);

        serializer.serialize
            .withArgs(RESULT)
            .returns(JSON.stringify(RESULT));

        serializer.deserialize
            .withArgs(JSON.stringify(RESULT))
            .returns(RESULT);

        serializer.serialize
            .withArgs(ERROR)
            .returns('error');

        serializer.deserialize
            .withArgs('error')
            .returns(ERROR);
    });

    afterEach(() => {
        serverStub.done();
    });

    it('simple command request', async () => {
        serverStub
            .post('/')
            .reply(200, serializer.serialize(RESULT));

        const result = await client.handle(COMMAND);

        expect(result)
            .toEqual(RESULT);
    });

    it('throws command bus error if when gets returned', () => {
        serverStub
            .post('/')
            .reply(200, serializer.serialize(ERROR), {
                'X-command-bus-error': '1'
            });

        return expect(client.handle(COMMAND))
            .rejects
            .toEqual(ERROR);
    });

    it('using custom middleware', async () => {
        const FAKE_HEADER_NAME = 'x-fake';
        const FAKE_HEADER_VALUE = 'faker';

        serverStub
            .post('/')
            .matchHeader(FAKE_HEADER_NAME, FAKE_HEADER_VALUE)
            .reply(200, serializer.serialize(RESULT));

        client.use(
            (next: Middleware.Next, request: Client.Request<any>) => {
                if (request.init.headers instanceof Headers) {
                    request.init.headers.set(FAKE_HEADER_NAME, FAKE_HEADER_VALUE);
                }
                return next(request);
            }
        );

        const result = await client.handle(COMMAND);
        expect(result)
            .toEqual(RESULT);
    });
});