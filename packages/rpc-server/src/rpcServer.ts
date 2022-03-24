import {CommandBus, Command} from "alpha-command-bus";
import * as express from 'express';
import {Serializer, serializer as ser} from "alpha-serializer";
import * as is from 'predicates';
import asyncHandler = require('express-async-handler');
import {RemoteServerError} from "@pallad/common-errors";
import {raw} from 'body-parser';
import typeIs = require('type-is');
import {Transform, Readable, TransformCallback} from 'stream';
import * as busboy from "busboy";
import {isReadableStream} from './isReadableStream';

function createNonCommandBodyError() {
    return new RemoteServerError('Request body does not look like a command object. Make sure you have sent proper command object')
}

export function rpcServer(commandBus: CommandBus, options: Options = {}) {
    const serializer = options.serializer || ser;

    const router = express.Router();

    router.use(raw({
        type: ['application/json']
    }));

    router.use(
        asyncHandler(async function (req: express.Request, res: express.Response) {
            try {
                const command = await createCommandFromRequest(req);
                const result = await commandBus.handle(command);
                if (isReadableStream(result)) {
                    res.status(200).header('Content-Type', 'application/octet-stream');
                    result.pipe(res);
                } else {
                    res.status(200)
                        .header('Content-Type', 'application/json')
                        .send(serializer.serialize(result));
                }
                options?.onResult && options.onResult(result);
            } catch (e: any) {
                res.status(200)
                    .header('X-command-bus-error', '1')
                    .header('Content-type', 'application/json')
                    .send(serializer.serialize(e));
                options?.onError && options.onError(e);
            }
        })
    );

    function getCommandBodyFromMultipart(serializer: Serializer, req: express.Request): Promise<any> {
        return new Promise((resolve, reject) => {
            let result: any = {};
            const parser = busboy({
                headers: req.headers,
                fileHwm: 1024 * 1024 * 100
            });

            parser.on('file', (fieldname, file) => {
                const finalFile = file as Readable;

                result[fieldname] = finalFile.pipe(new Transform({
                    highWaterMark: finalFile.readableHighWaterMark,
                    transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback) {
                        this.push(chunk);
                        callback();
                    }
                }));
            });

            parser.on('field', (name, value) => {
                if (name === 'commandBody') {
                    Object.assign(result, serializer.deserialize(value));
                }
            });

            parser.on('finish', () => {
                resolve(result);
            });

            parser.on('error', (e: any) => {
                reject(e);
            });

            req.pipe(parser);
        });
    }

    async function createCommandFromRequest(req: express.Request) {
        let command: Command | undefined;

        const mediaType = req.header('content-type');
        if (!mediaType) {
            throw new RemoteServerError(`Missing content-type`);
        }

        if (typeIs.is(mediaType, ['json'])) {
            const body = req.body;
            if (is.empty(body)) {
                throw new RemoteServerError('Missing body for command');
            }
            try {
                if (is.string(body)) {
                    command = serializer.deserialize(body);
                } else if (Buffer.isBuffer(body)) {
                    command = serializer.deserialize((body as Buffer).toString('utf8'));
                } else {
                    command = serializer.normalizer.denormalize(body);
                }
            } catch (e: any) {
                throw new RemoteServerError(`Cannot deserialize body: ${e.message}`);
            }
        } else if (typeIs.is(mediaType, ['multipart'])) {
            command = await getCommandBodyFromMultipart(serializer, req);
        } else {
            throw new RemoteServerError(`Unsupported content-type: ${req.header('content-type')}`)
        }

        if (!command) {
            throw createNonCommandBodyError();
        }

        if (!is.prop('command', String)(command)) {
            throw createNonCommandBodyError();
        }

        if (options.prepareCommand) {
            command = await options.prepareCommand(command, req);
        }

        options?.onCommand && options.onCommand(command);
        return command;
    }

    return router;
}

export interface Options {
    serializer?: Serializer;
    onResult?: (result: any) => void,
    onError?: (error: Error) => void,
    onCommand?: (command: Command) => void
    prepareCommand?: (command: Command, req: express.Request) => Promise<Command> | Command;
}
