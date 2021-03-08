import {Annotation, AutowiredService} from "alpha-dic";
import {commandHandlerObjectAnnotation} from "./commandHandlerObjectAnnotation";

export function CommandHandlerService() {
    return function (clazz: { new(...args: any[]): any }) {
        AutowiredService()(clazz);
        Annotation(commandHandlerObjectAnnotation())(clazz);
    }
}
