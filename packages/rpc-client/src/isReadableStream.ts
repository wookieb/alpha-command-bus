import {Readable} from 'stream';
import * as is from 'predicates';

const hasReadableStruct = is.struct({
    read: Function,
    pipe: Function
});

export function isReadableStream(value: any): value is Readable {
    return hasReadableStruct(value);
}
