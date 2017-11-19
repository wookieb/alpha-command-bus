import {CommandBus} from 'alpha-command-bus';
import {Mapper, MapperConfig} from "./Mapper";

export * from './Mapper';

export function createMapper(commandBus: CommandBus, config: Partial<MapperConfig>) {
    const mapper = new Mapper(commandBus, config);

    return mapper.map.bind(mapper);
}