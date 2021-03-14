import {Command} from './Command';

export type CommandRunner<TResult = any, TContext = undefined> = (command: Command, context: TContext) => Promise<TResult>;

