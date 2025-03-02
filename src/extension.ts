import * as vscode from 'vscode';
import { EnvironmentManager, SqlxCommandHandler, SqlxTreeDataProvider } from './lib';

export function activate(context: vscode.ExtensionContext) {
    // Initialize environment manager
    const environmentManager = new EnvironmentManager(context.globalState);

    // Initialize command handler
    const commandHandler = new SqlxCommandHandler(environmentManager);

    // Initialize tree view
    const treeDataProvider = new SqlxTreeDataProvider(environmentManager);
    vscode.window.registerTreeDataProvider('sqlxManager', treeDataProvider);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('sqlxManager.checkMigrationStatus', () =>
            commandHandler.checkMigrationStatus(),
        ),

        vscode.commands.registerCommand('sqlxManager.runMigrations', () =>
            commandHandler.runMigrations(),
        ),

        vscode.commands.registerCommand('sqlxManager.revertMigration', () =>
            commandHandler.revertMigration(),
        ),

        vscode.commands.registerCommand('sqlxManager.createMigration', () =>
            commandHandler.createMigration(),
        ),

        vscode.commands.registerCommand('sqlxManager.addEnvironment', () =>
            commandHandler.addEnvironment().then(() => treeDataProvider.refresh()),
        ),

        vscode.commands.registerCommand('sqlxManager.editEnvironment', (envItem) =>
            commandHandler.editEnvironment(envItem?.id).then(() => treeDataProvider.refresh()),
        ),

        vscode.commands.registerCommand('sqlxManager.deleteEnvironment', (envItem) =>
            commandHandler.deleteEnvironment(envItem?.id).then(() => treeDataProvider.refresh()),
        ),

        vscode.commands.registerCommand('sqlxManager.selectEnvironment', (envItem) =>
            commandHandler.selectEnvironment(envItem?.id).then(() => treeDataProvider.refresh()),
        ),
    );

    // Status bar item for current environment
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'workbench.view.extension.sqlxManager';
    context.subscriptions.push(statusBarItem);

    // Update status bar with current environment
    const updateStatusBar = () => {
        const currentEnv = environmentManager.getCurrentEnvironment();
        if (currentEnv) {
            statusBarItem.text = `$(database) SQLX: ${currentEnv.name}`;
            statusBarItem.tooltip = `Current SQLX Environment: ${currentEnv.name}\nDatabase URL: ${currentEnv.databaseUrl}`;
            statusBarItem.show();
        } else {
            statusBarItem.text = '$(database) SQLX: No Environment';
            statusBarItem.tooltip = 'No SQLX environment selected';
            statusBarItem.show();
        }
    };

    const updateGuiHeader = () => {
        const currentEnv = environmentManager.getCurrentEnvironment();

        vscode.commands.executeCommand(
            'setContext',
            'sqlxManager.hasCurrentEnvironment',
            !!currentEnv,
        );
    };

    environmentManager.onEnvironmentChanged(() => {
        updateStatusBar();
        updateGuiHeader();
        treeDataProvider.refresh();
    });

    updateStatusBar();
}

// This method is called when your extension is deactivated
export function deactivate() {}
