import {CommandBus, Command} from "alpha-command-bus";
import * as express from 'express';
import {Serializer, serializer as ser} from "alpha-serializer";
import * as is from 'predicates';

import asyncHandler = require('express-async-handler');
import {RemoteServerError} from "@pallad/common-errors";

export function rpcServer(commandBus: CommandBus, options: Options = {}) {
    const serializer = options.serializer || ser;

    async function createCommandFromRequest(req: express.Request) {
        if (is.empty(req.body)) {
            throw new RemoteServerError('Missing body for command');
        }

        let command: Command;
        try {
            const body = req.body;
            if (is.string(body)) {
                command = serializer.deserialize(body);
            } else if (Buffer.isBuffer(body)) {
                command = serializer.deserialize((body as Buffer).toString('utf8'));
            } else {
                command = serializer.normalizer.denormalize(body);
            }
        } catch (e) {
            throw new RemoteServerError(`Cannot deserialize body: ${e.message}`);
        }

        if (!is.prop('command', String)(command)) {
            throw new RemoteServerError('Request body does not look like a command object. Make sure you have sent proper command object')
        }

        if (options.prepareCommand) {
            command = await options.prepareCommand(command, req);
        }
        return command;
    }

    return asyncHandler(async function (req: express.Request, res: express.Response) {
        try {
            const command = await createCommandFromRequest(req);
            const result = await commandBus.handle(command);
            res.status(200)
                .header('Content-Type', 'application/json')
                .send(serializer.serialize(result));
        } catch (e) {
            res.status(200)
                .header('X-command-bus-error', '1')
                .header('Content-type', 'application/json')
                .send(serializer.serialize(e));
        }
    })
}

export interface Options {
    serializer?: Serializer;
    prepareCommand?: (command: Command, req: express.Request) => Promise<Command> | Command;
}
