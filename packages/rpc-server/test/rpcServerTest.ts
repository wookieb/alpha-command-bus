import {rpcServer,} from "@src/rpcServer";
import * as sinon from 'sinon';
import {CommandBus} from "alpha-command-bus";
import * as express from 'express';
import {DataNormalizer, JSONAdapter, Serializer} from "alpha-serializer";
import {RemoteServerError} from "@pallad/common-errors";
import request = require('supertest');
import {Readable} from 'stream';
import {ReadableStreamBuffer} from 'stream-buffers';
import * as fs from 'fs';
import * as path from 'path';
import streamToPromise = require('stream-to-promise');

describe('rpcServer', () => {
    let commandBus: sinon.SinonStubbedInstance<CommandBus>;
    let serializer: Serializer;
    let server: express.Application;
    const COMMAND = {command: 'example'};

    const BUFFER = Buffer.from('Croire note public membre avoir petit mais.', 'utf8');
    const OBJECTS = [
        {sen: 'Move prepare thus ahead best herself.'},
        {sen: 'Comme inquiétude lequel dehors or.'},
        {sen: 'Quand toit pleurer cour oui second.'},
        {sen: 'Aspernatur tempora aliquid porro laboriosam illo.'}
    ];

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
            clazz: RemoteServerError,
            name: 'RPCServerError',
            normalizer(e) {
                return {message: e.message, name: e.name};
            }
        });

        server = express();
        server.use(rpcServer(commandBus as any, {
            serializer
        }));
    });

    describe('throws error if', () => {
        afterEach(() => {
            sinon.assert.notCalled(commandBus.handle);
        });

        it('request body is missing', async () => {
            const error = new RemoteServerError('Missing body for command');

            const response = await request(server)
                .get('/')
                .set('content-type', 'application/json')
                .expect(200);

            expect(serializer.normalizer.denormalize(response.body))
                .toEqual(error);
        });

        it('body cannot be deserialized', async () => {
            const error = new RemoteServerError('Cannot deserialize body: Unexpected token s in JSON at position 0');

            const response = await request(server)
                .post('/')
                .set('content-type', 'application/json')
                .send('some body')
                .expect(200);

            expect(serializer.normalizer.denormalize(response.body))
                .toEqual(error);
        });

        it('body cannot be denormalized', async () => {
            const error = new RemoteServerError('Cannot deserialize body: Missing normalization for type test');

            const response = await request(server)
                .post('/')
                .set('content-type', 'application/json')
                .send({
                    test: {'@type': 'test', value: 'data'}
                })
                .expect(200);

            expect(serializer.normalizer.denormalize(response.body))
                .toEqual(error);
        });

        it('body does not look like command', async () => {
            const error = new RemoteServerError('Request body does not look like a command object. Make sure you have sent proper command object');

            const response = await request(server)
                .post('/')
                .set('content-type', 'application/json')
                .send({
                    test: 1
                })
                .expect(200);

            expect(serializer.normalizer.denormalize(response.body))
                .toEqual(error);
        })
    });

    describe('success', () => {
        it('regular result', async () => {
            const result = {example: 'result'};

            commandBus.handle
                .withArgs(COMMAND)
                .resolves(result);

            const response = await request(server)
                .post('/')
                .send(serializer.serialize(COMMAND))
                .set('content-type', 'application/json')
                .expect('content-type', /json/)
                .expect(200);

            expect(serializer.normalizer.denormalize(response.body))
                .toEqual(result);
        });

        it('returns stream', async () => {
            const result = new ReadableStreamBuffer();

            commandBus.handle
                .withArgs(COMMAND)
                .resolves(result);

            const responsePromise = request(server)
                .post('/')
                .send(serializer.serialize(COMMAND))
                .set('content-type', 'application/json')
                .expect('content-type', /octet\-stream/)
                .expect(200);

            result.put(BUFFER);
            result.stop();

            const response = await responsePromise;
            expect(response.body.equals(BUFFER))
                .toBe(true);
        });

        it('error thrown', async () => {
            const error = new Error('Example error');

            commandBus.handle
                .withArgs(COMMAND)
                .rejects(error);

            const response = await request(server)
                .post('/')
                .send(serializer.serialize(COMMAND))
                .set('content-type', 'application/json')
                .expect('content-type', /json/)
                .expect('X-command-bus-error', '1')
                .expect(200);

            expect(serializer.normalizer.denormalize(response.body))
                .toEqual(error);
        });
    });

    describe('handles files upload', () => {
        it('simple example', async () => {
            const filePath = path.resolve(
                __dirname,
                './tsconfig.json'
            )
            const fileStream = fs.createReadStream(filePath);

            await request(server)
                .post('/')
                .field('commandBody', serializer.serialize({
                    command: COMMAND.command
                }))
                .attach('config', fileStream, {contentType: 'application/octet-stream'})
                .expect('content-type', /json/)
                .expect(200);

            const command: any = commandBus.handle.getCall(0).args[0];
            expect(command)
                .toMatchObject({
                    command: COMMAND.command,
                    config: expect.any(Readable)
                });

            const expectedContent = fs.readFileSync(filePath);
            const commandConfigContent = await streamToPromise((command as any).config);

            expect(expectedContent.equals(commandConfigContent))
                .toBe(true);
        });
    });
});
