import {Command} from './Command';

export type CommandRunner<TResult = any, TContext = never> = (command: Command, context: TContext) => Promise<TResult>;

