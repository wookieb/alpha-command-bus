import {JSONAdapter, Serializer, StandardNormalizer} from "alpha-serializer";
import {Client} from "@src/Client";
import {ReadableStreamBuffer} from 'stream-buffers';
import {Readable} from 'stream';
import streamToPromise = require('stream-to-promise');
import {createServer, IncomingMessage, Server, ServerResponse} from 'http';
import {once} from 'events'
import {AddressInfo} from "net";
import * as sinon from 'sinon';
import {setGlobalDispatcher, Agent} from 'undici'
import {promisify} from 'util';
import * as busboy from "busboy";

const agent = new Agent({
    keepAliveTimeout: 10, // milliseconds
    keepAliveMaxTimeout: 10 // milliseconds
})

setGlobalDispatcher(agent)

describe('Client', () => {
    let server: Server;
    let client: Client;
    let requestHandler: sinon.SinonStub;

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
    );

    const COMMAND = {command: 'example', arg1: 'test', date: new Date()};
    const RESULT = {some: 'result'};
    const ERROR = new Error('test');
    const BUFFERS = [
        Buffer.from('Soluta quis enim dicta modi sunt rem.', 'utf8'),
        Buffer.from('Soluta quis enim dicta modi sunt rem.', 'utf8'),
        Buffer.from('Soluta quis enim dicta modi sunt rem.', 'utf8'),
        Buffer.from('Soluta quis enim dicta modi sunt rem.', 'utf8'),
    ];

    beforeEach(async () => {
        requestHandler = sinon.stub();
        server = createServer(requestHandler).listen();
        await once(server, 'listening')

        client = new Client(`http://localhost:${(server.address() as AddressInfo).port}/some-path`, serializer as unknown as Serializer);
    });

    afterEach(async () => {
        await client.close()
        await promisify(server.close.bind(server))();
    });

    function handleRequest(handler: (req: IncomingMessage, res: ServerResponse) => void) {
        requestHandler.callsFake(handler);
    }

    it('simple command request', async () => {
        handleRequest((req, res) => {
            res.statusCode = 200;
            res.setHeader('content-type', 'application/json');
            res.end(serializer.serialize(RESULT));
        });
        const result = await client.handle(COMMAND, undefined);

        expect(result)
            .toEqual(RESULT);
    });

    it('handles undefined properly', async () => {
        handleRequest((req, res) => {
            res.statusCode = 200;
            res.setHeader('content-type', 'application/json');
            res.end();
        });
        const result = await client.handle(COMMAND, undefined);

        expect(result)
            .toBeUndefined();
    });

    it('handles null properly', async () => {
        handleRequest((req, res) => {
            res.statusCode = 200;
            res.setHeader('content-type', 'application/json');
            res.end('null');
        });
        const result = await client.handle(COMMAND, undefined);

        expect(result)
            .toBeNull();
    })

    it('returning stream', async () => {
        handleRequest((req, res) => {
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

            res.setHeader('content-type', 'application/octet-stream');
            stream.pipe(res);
        });

        const result = await client.handle<Readable>(COMMAND, undefined);

        const content = await streamToPromise(result);
        expect(Buffer.concat(BUFFERS).equals(content))
            .toBe(true);
    })

    it('throws command bus error if when gets returned', () => {
        handleRequest((req, res) => {
            res.setHeader('content-type', 'application/json');
            res.setHeader('x-command-bus-error', '1');
            res.statusCode = 200;
            res.end(serializer.serialize(ERROR));
        });

        return expect(client.handle(COMMAND, undefined))
            .rejects
            .toEqual(ERROR);
    });

    it('using custom middleware', async () => {
        const FAKE_HEADER_NAME = 'x-fake';
        const FAKE_HEADER_VALUE = 'faker';

        handleRequest((req, res) => {
            res.statusCode = 200;
            res.setHeader('content-type', 'application/json');
            res.end(serializer.serialize(RESULT));
            expect(req.headers[FAKE_HEADER_NAME])
                .toBe(FAKE_HEADER_VALUE);
        });

        client.use(
            (context, next) => {
                (context.request.headers as any)[FAKE_HEADER_NAME] = FAKE_HEADER_VALUE;
                return next(context);
            }
        );

        const result = await client.handle(COMMAND, undefined);
        expect(result)
            .toEqual(RESULT);
    });


    it('sending files from command', async () => {
        const receivedData = {
            fields: {} as any,
            files: {} as any
        }

        handleRequest((req, res) => {
            const busboyHandler = busboy({headers: req.headers});
            busboyHandler.on('file', (name, file) => {
                receivedData.files[name] = streamToPromise(file);
            });
            busboyHandler.on('field', (name, val) => {
                receivedData.fields[name] = val;
            })
            busboyHandler.on('close', () => {
                res.statusCode = 200;
                res.end(serializer.serialize(RESULT));
            });
            req.pipe(busboyHandler);
        });

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

        const result = await client.handle(command, undefined);
        expect(result)
            .toEqual(RESULT);

        expect(serializer.deserialize(receivedData.fields.commandBody))
            .toEqual(commandData);

        const fileBuffer = await receivedData.files.file;

        expect(Buffer.concat(BUFFERS).equals(fileBuffer))
            .toBe(true);
    });
});
