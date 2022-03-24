import {Annotation, AutowiredService} from "alpha-dic";
import {commandHandlerObjectAnnotation} from "./commandHandlerObjectAnnotation";

// eslint-disable-next-line @typescript-eslint/naming-convention
export function CommandHandlerService() {
    return function (clazz: { new(...args: any[]): any }) {
        AutowiredService()(clazz);
        Annotation(commandHandlerObjectAnnotation())(clazz);
    }
}
