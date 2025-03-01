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
        vscode.commands.registerCommand('sqlx-manager.checkMigrationStatus', () =>
            commandHandler.checkMigrationStatus(),
        ),

        vscode.commands.registerCommand('sqlx-manager.runMigrations', () =>
            commandHandler.runMigrations(),
        ),

        vscode.commands.registerCommand('sqlx-manager.revertMigration', () =>
            commandHandler.revertMigration(),
        ),

        vscode.commands.registerCommand('sqlx-manager.createMigration', () =>
            commandHandler.createMigration(),
        ),

        vscode.commands.registerCommand('sqlx-manager.addEnvironment', () =>
            commandHandler.addEnvironment().then(() => treeDataProvider.refresh()),
        ),

        vscode.commands.registerCommand('sqlx-manager.editEnvironment', (envItem) =>
            commandHandler.editEnvironment(envItem.id).then(() => treeDataProvider.refresh()),
        ),

        vscode.commands.registerCommand('sqlx-manager.deleteEnvironment', (envItem) =>
            commandHandler.deleteEnvironment(envItem.id).then(() => treeDataProvider.refresh()),
        ),

        vscode.commands.registerCommand('sqlx-manager.selectEnvironment', (envItem) =>
            commandHandler.selectEnvironment(envItem.id).then(() => treeDataProvider.refresh()),
        ),
    );

    // Status bar item for current environment
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'sqlx-manager.selectEnvironment';
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

    environmentManager.onEnvironmentChanged(() => {
        updateStatusBar();
        treeDataProvider.refresh();
    });

    updateStatusBar();
}

// This method is called when your extension is deactivated
export function deactivate() {}
