import {Annotation, Service} from "alpha-dic";
import {commandHandlerObjectAnnotation} from "./commandHandlerObjectAnnotation";

export function CommandHandlerService() {
    return function (clazz: { new(...args: any[]): any }) {
        Service()(clazz);
        Annotation(commandHandlerObjectAnnotation())(clazz);
    }
}