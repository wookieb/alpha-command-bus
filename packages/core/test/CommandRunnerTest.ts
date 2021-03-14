import {assert, IsExact} from 'conditional-type-checks';
import {CommandRunner} from '@src/CommandRunner';
import {Command} from '@src/Command';

describe('CommandRunner', () => {
    it('accepts only one argument for context of never', () => {
        type Runner = CommandRunner<string>;

        assert<IsExact<Runner, (command: Command) => Promise<string>>>(true);
        assert<IsExact<Runner, (command: Command, context: any) => Promise<string>>>(false);
    });

    it('accepts two arguments if context is not never', () => {
        type Runner = CommandRunner<string, { foo: 'bar' }>;

        assert<IsExact<Runner, (command: Command, context: { foo: 'bar' }) => Promise<string>>>(true);
        assert<IsExact<Runner, (command: Command, context: never) => Promise<string>>>(false);
    });

    it('accepts two arguments if context is optional', () => {
        type Runner = CommandRunner<string, { foo: 'bar' } | undefined>;

        assert<IsExact<Runner, (command: Command, context?: {foo: 'bar'}) => Promise<string>>>(true);
        assert<IsExact<Runner, (command: Command, context: never) => Promise<string>>>(false);
    });
});
