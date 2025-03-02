import * as vscode from 'vscode';
import { EnvironmentManager } from '../lib/environmentManager';
import {
    COMMAND_CREATE_ENVIRONMENT,
    COMMAND_HAS_CURRENT_ENVIRONMENT,
    COMMAND_SELECT_ENVIRONMENT,
} from './constants';

export class EnvironmentTreeItem extends vscode.TreeItem {
    constructor(
        public readonly id: string,
        public readonly label: string,
        public readonly databaseUrl: string,
        public readonly isCurrent: boolean,
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);

        this.tooltip = `Database URL: ${databaseUrl}`;
        this.description = isCurrent ? '(current)' : '';
        this.contextValue = 'environment';
        this.iconPath = new vscode.ThemeIcon(isCurrent ? 'database' : 'circle-outline');

        // Add command to select this environment when clicked
        this.command = {
            command: COMMAND_SELECT_ENVIRONMENT,
            title: 'Select Environment',
            arguments: [{ id }],
        };
    }
}

export class SqlxTreeDataProvider implements vscode.TreeDataProvider<EnvironmentTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<EnvironmentTreeItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private environmentManager: EnvironmentManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: EnvironmentTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: EnvironmentTreeItem): Promise<EnvironmentTreeItem[]> {
        if (element) {
            return [];
        }

        const environments = this.environmentManager.getAllEnvironments();
        const currentEnv = this.environmentManager.getCurrentEnvironment();

        // Set context for menu visibility
        if (environments.length === 0) {
            return [this.getNoEnvironmentsItem()];
        }

        // Also set context for if there's a current environment selected
        vscode.commands.executeCommand('setContext', COMMAND_HAS_CURRENT_ENVIRONMENT, !!currentEnv);

        return environments.map(
            (env) =>
                new EnvironmentTreeItem(
                    env.id,
                    env.name,
                    env.databaseUrl,
                    currentEnv ? env.id === currentEnv.id : false,
                ),
        );
    }

    private getNoEnvironmentsItem(): EnvironmentTreeItem {
        const item = new EnvironmentTreeItem(
            'no-environments',
            'No environments configured',
            '',
            false,
        );

        item.command = {
            command: COMMAND_CREATE_ENVIRONMENT,
            title: 'New Database Environment',
        };

        item.tooltip = 'New Database Environment';

        return item;
    }
}
