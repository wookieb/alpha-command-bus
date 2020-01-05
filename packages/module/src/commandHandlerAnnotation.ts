export function commandHandlerAnnotation() {
    return {name: ANNOTATION}
}

const ANNOTATION = '_alphaCommandHandler';

export namespace commandHandlerAnnotation {
    export const PREDICATE = (x: any) => x && x.name === ANNOTATION;
}