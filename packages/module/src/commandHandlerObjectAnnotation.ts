export function commandHandlerObjectAnnotation() {
    return {
        name: ANNOTATION
    };
}

const ANNOTATION = '_alphaCommandHandlerObject';
export namespace commandHandlerObjectAnnotation {
    export const PREDICATE = (x: any) => x && x.name === ANNOTATION;
}