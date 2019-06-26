import { Command } from 'vscode-languageclient';
import { Configuration } from '../src/Configuration';
import { LanguageClientController } from '../src/LanguageClientController';
import { Notify } from '../src/Notify';

describe('LanguageClientController', () => {
    const config = {
        get: () => {},
    };

    const workspace: any = {
        getConfiguration: () => {
            return config;
        },
    };
    const outputChannel: any = {
        clear: () => {},
        show: () => {},
    };

    const notify = new Notify();

    const commands: any = {
        commands: {},
        registerTextEditorCommand: (name: string, cb: Function) => {
            commands.commands[name] = cb;

            return {
                dispose: () => {},
            };
        },
    };

    const textEditor = {
        document: {
            uri: 'foo.php',
            languageId: 'php',
        },
        selection: {
            active: {
                line: 0,
                character: 0,
            },
        },
    };

    const client: any = {
        notifications: {},
        requests: {},
        onReady: () => {
            return Promise.resolve(true);
        },
        onNotification: (name: string, cb: Function) => {
            client.notifications[name] = cb;
        },
        triggerNotification: (name: string, params?: any) => {
            client.notifications[name](params);
        },
        sendRequest: (_type: any, command: Command) => {
            client.requests[command.command] = command;
        },
        triggerCommand: async (name: string) => {
            await commands.commands[name](textEditor);

            return client.requests[name.replace(/codecept\./, 'codecept.lsp.')];
        },
    };

    const configuration = new Configuration(workspace);

    let controller: LanguageClientController;

    beforeEach(() => {
        controller = new LanguageClientController(
            client,
            configuration,
            outputChannel,
            notify,
            commands
        );
        controller.init();
    });

    it('execute run all', async () => {
        expect(await client.triggerCommand('codecept.run-all')).toEqual({
            command: 'codecept.lsp.run-all',
            arguments: ['foo.php', 'foo.php', 0],
        });
    });

    it('execute rerun', async () => {
        expect(await client.triggerCommand('codecept.rerun')).toEqual({
            command: 'codecept.lsp.rerun',
            arguments: ['foo.php', 'foo.php', 0],
        });
    });

    it('execute run file', async () => {
        expect(await client.triggerCommand('codecept.run-file')).toEqual({
            command: 'codecept.lsp.run-file',
            arguments: ['foo.php', 'foo.php', 0],
        });
    });

    it('execute run test at cursor', async () => {
        expect(
            await client.triggerCommand('codecept.run-test-at-cursor')
        ).toEqual({
            command: 'codecept.lsp.run-test-at-cursor',
            arguments: ['foo.php', 'foo.php', 0],
        });
    });

    it('execute cancel', async () => {
        expect(await client.triggerCommand('codecept.cancel')).toEqual({
            command: 'codecept.lsp.cancel',
            arguments: ['foo.php', 'foo.php', 0],
        });
    });

    it('dispose', () => {
        controller.dispose();

        expect(controller['disposables']).toEqual([]);
    });

    it('run test and clear outputChannel', () => {
        spyOn(config, 'get').and.returnValue(true);
        spyOn(outputChannel, 'clear');
        spyOn(notify, 'show');

        client.triggerNotification('TestRunStartedEvent');

        expect(outputChannel.clear).toHaveBeenCalled();
        expect(notify.show).toHaveBeenCalled();
    });

    it('show outputChanel when has error', () => {
        spyOn(config, 'get').and.returnValue('onFailure');
        spyOn(outputChannel, 'show');
        spyOn(notify, 'hide');

        const params = {
            command: {
                title: '',
                command: 'foo',
            },
            events: [
                {
                    state: 'failed',
                },
            ],
        };

        client.triggerNotification('TestRunFinishedEvent', params);

        expect(outputChannel.show).toHaveBeenCalled();
        expect(notify.hide).toHaveBeenCalled();
    });
});
