import nock = require('nock');
import {JSONAdapter, Serializer, StandardNormalizer} from "alpha-serializer";
import {Client} from "@src/Client";
import {ReadableStreamBuffer} from 'stream-buffers';
import {Readable} from 'stream';
import streamToPromise = require('stream-to-promise');
import {ReplyFnContext} from 'nock';
import * as Busboy from 'busboy';

describe('Client', () => {
    let serverStub: nock.Scope;
    let client: Client;

    const normalizer = new StandardNormalizer();
    normalizer.registerNormalization({
        clazz: Error,
        normalizer(err: Error) {
            return err.message;
        },
        denormalizer(message: string) {
            return new Error(message);
        }
    });

    const serializer = new Serializer(
        new JSONAdapter(),
        normalizer
    )

    const COMMAND = {command: 'example', arg1: 'test', date: new Date()};
    const RESULT = {some: 'result'};
    const ERROR = new Error('test');
    const BUFFERS = [
        Buffer.from('Soluta quis enim dicta modi sunt rem.', 'utf8'),
        Buffer.from('Soluta quis enim dicta modi sunt rem.', 'utf8'),
        Buffer.from('Soluta quis enim dicta modi sunt rem.', 'utf8'),
        Buffer.from('Soluta quis enim dicta modi sunt rem.', 'utf8'),
    ];

    beforeEach(() => {
        client = new Client('http://command-bus-server-http', serializer as any as Serializer);
        serverStub = nock('http://command-bus-server-http');
    });

    afterEach(() => {
        serverStub.done();
    });

    it('simple command request', async () => {
        serverStub
            .post('/')
            .delay(40)
            .reply(200, serializer.serialize(RESULT), {
                'content-type': 'application/json'
            });

        const result = await client.handle(COMMAND, undefined);

        expect(result)
            .toEqual(RESULT);
    });

    it('returning stream', async () => {
        serverStub
            .post('/')
            .delay(40)
            .reply(200, () => {
                const stream = new ReadableStreamBuffer();
                const buffers = BUFFERS.slice();
                const interval = setInterval(() => {
                    const buffer = buffers.shift();
                    if (buffer) {
                        stream.put(buffer);
                    } else {
                        stream.stop();
                        clearInterval(interval);
                    }
                }, 20);
                return stream;
            }, {
                'content-type': 'application/octet-stream'
            });

        const result = await client.handle<Readable>(COMMAND, undefined);

        const content = await streamToPromise(result);
        expect(Buffer.concat(BUFFERS).equals(content))
            .toBe(true);
    })

    it('throws command bus error if when gets returned', () => {
        serverStub
            .post('/')
            .delay(40)
            .reply(200, serializer.serialize(ERROR), {
                'X-command-bus-error': '1',
                'content-type': 'application/json'
            });

        return expect(client.handle(COMMAND, undefined))
            .rejects
            .toEqual(ERROR);
    });

    it('using custom middleware', async () => {
        const FAKE_HEADER_NAME = 'x-fake';
        const FAKE_HEADER_VALUE = 'faker';

        serverStub
            .post('/')
            .delay(40)
            .matchHeader(FAKE_HEADER_NAME, FAKE_HEADER_VALUE)
            .reply(200, serializer.serialize(RESULT), {
                'content-type': 'application/json'
            });

        client.use(
            (context, next) => {
                context.request.set(FAKE_HEADER_NAME, FAKE_HEADER_VALUE);
                return next(context);
            }
        );

        const result = await client.handle(COMMAND, undefined);
        expect(result)
            .toEqual(RESULT);
    });

    it('sending files from command', async () => {
        const commandData = COMMAND;
        const stream = new ReadableStreamBuffer();

        for (const buffer of BUFFERS) {
            stream.put(buffer);
        }
        stream.stop();
        const command = {
            ...commandData,
            file: stream
        };

        const receivedData = {
            fields: {} as any,
            files: {} as any
        }
        serverStub
            .post('/')
            .reply(200, async function (this: ReplyFnContext, uri, body) {
                const busboy = new Busboy({headers: this.req.headers});

                busboy.on('file', (name, file) => {
                    receivedData.files[name] = file;
                });

                busboy.on('field', (name, val) => {
                    receivedData.fields[name] = val;
                })

                const stream = new ReadableStreamBuffer();
                stream.put(body as string);
                stream.pipe(busboy);
                stream.stop();
                return serializer.serialize(RESULT);
            }, {
                'content-type': 'application/json'
            });


        const result = await client.handle(command, undefined);
        expect(result)
            .toEqual(RESULT);

        expect(serializer.deserialize(receivedData.fields.commandBody))
            .toEqual(commandData);

        const fileBuffer = await streamToPromise(receivedData.files.file);

        expect(Buffer.concat(BUFFERS).equals(fileBuffer))
            .toBe(true);
    });
});
