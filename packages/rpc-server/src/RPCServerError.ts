export class RPCServerError extends Error {
    constructor(message: string) {
        super(message);
        this.message = message;
        this.name = 'RPCServerError';
    }
}