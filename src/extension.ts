import * as vscode from 'vscode';
import { EnvironmentManager, SqlxCommandHandler, SqlxTreeDataProvider } from './lib';
import {
    COMMAND_CREATE_ENVIRONMENT,
    COMMAND_CHECK_MIGRATION_STATUS,
    COMMAND_CREATE_MIGRATION,
    COMMAND_DELETE_ENVIRONMENT,
    COMMAND_EDIT_ENVIRONMENT,
    COMMAND_HAS_CURRENT_ENVIRONMENT,
    COMMAND_REVERT_MIGRATION,
    COMMAND_RUN_MIGRATIONS,
    COMMAND_SELECT_ENVIRONMENT,
    COMMAND_VIEW_EXTENSION,
    EXTENSION_NAME,
} from './lib/constants';

export function activate(context: vscode.ExtensionContext) {
    // Initialize environment manager with both workspace and global storage
    const environmentManager = new EnvironmentManager(context.workspaceState, context.globalState);

    // Initialize command handler
    const commandHandler = new SqlxCommandHandler(environmentManager);

    // Initialize tree view
    const treeDataProvider = new SqlxTreeDataProvider(environmentManager);
    vscode.window.registerTreeDataProvider(`${EXTENSION_NAME}`, treeDataProvider);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand(COMMAND_CHECK_MIGRATION_STATUS, () =>
            commandHandler.checkMigrationStatus(),
        ),

        vscode.commands.registerCommand(COMMAND_RUN_MIGRATIONS, () =>
            commandHandler.runMigrations(),
        ),

        vscode.commands.registerCommand(COMMAND_REVERT_MIGRATION, () =>
            commandHandler.revertMigration(),
        ),

        vscode.commands.registerCommand(COMMAND_CREATE_MIGRATION, () =>
            commandHandler.createMigration(),
        ),

        vscode.commands.registerCommand(COMMAND_CREATE_ENVIRONMENT, () =>
            commandHandler.createEnvironment().then(() => treeDataProvider.refresh()),
        ),

        vscode.commands.registerCommand(COMMAND_EDIT_ENVIRONMENT, (envItem) =>
            commandHandler.editEnvironment(envItem?.id).then(() => treeDataProvider.refresh()),
        ),

        vscode.commands.registerCommand(COMMAND_DELETE_ENVIRONMENT, (envItem) =>
            commandHandler.deleteEnvironment(envItem?.id).then(() => treeDataProvider.refresh()),
        ),

        vscode.commands.registerCommand(COMMAND_SELECT_ENVIRONMENT, (envItem) =>
            commandHandler.selectEnvironment(envItem?.id).then(() => treeDataProvider.refresh()),
        ),
    );

    // Status bar item for current environment
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = COMMAND_VIEW_EXTENSION;
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

        vscode.commands.executeCommand('setContext', COMMAND_HAS_CURRENT_ENVIRONMENT, !!currentEnv);
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
