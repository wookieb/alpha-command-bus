export class BaseCommand {
    constructor(readonly command: string) {
    }

    freeze() {
        Object.freeze(this);
    }
}
