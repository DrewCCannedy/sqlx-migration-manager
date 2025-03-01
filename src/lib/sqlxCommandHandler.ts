import * as vscode from 'vscode';
import { EnvironmentManager } from './environmentManager';

export class SqlxCommandHandler {
    constructor(private environmentManager: EnvironmentManager) {}

    async checkMigrationStatus(): Promise<void> {
        const env = await this.getRequiredEnvironment();
        if (!env) {
            return;
        }

        const terminal = vscode.window.createTerminal('SQLX Migration Status');
        terminal.sendText(`sqlx migrate info --database-url "${env.databaseUrl}"`);
        terminal.show();
    }

    async runMigrations(): Promise<void> {
        const env = await this.getRequiredEnvironment();
        if (!env) {
            return;
        }

        const terminal = vscode.window.createTerminal('SQLX Run Migrations');
        terminal.sendText(`sqlx migrate run --database-url "${env.databaseUrl}"`);
        terminal.show();
    }

    async revertMigration(): Promise<void> {
        const env = await this.getRequiredEnvironment();
        if (!env) {
            return;
        }

        const confirmRevert = await vscode.window.showWarningMessage(
            'Are you sure you want to revert the last migration?',
            { modal: true },
            'Yes',
        );

        if (confirmRevert !== 'Yes') {
            return;
        }

        const terminal = vscode.window.createTerminal('SQLX Revert Migration');
        terminal.sendText(`sqlx migrate revert --database-url "${env.databaseUrl}"`);
        terminal.show();
    }

    async createMigration(): Promise<void> {
        const migrationName = await vscode.window.showInputBox({
            placeHolder: 'my-migration',
            prompt: 'Enter a name for the new migration',
            validateInput: (value) => {
                return value.trim() === '' ? 'Migration name cannot be empty' : null;
            },
        });

        if (!migrationName) {
            return;
        }

        const terminal = vscode.window.createTerminal('SQLX Create Migration');
        terminal.sendText(`sqlx migrate add -r "${migrationName}"`);
        terminal.show();
    }

    async addEnvironment(): Promise<void> {
        const name = await vscode.window.showInputBox({
            placeHolder: 'development',
            prompt: 'Enter a name for the environment',
            validateInput: (value) => {
                return value.trim() === '' ? 'Environment name cannot be empty' : null;
            },
        });

        if (!name) {
            return;
        }

        const databaseUrl = await vscode.window.showInputBox({
            placeHolder: 'postgres://user:password@localhost:5432/database',
            prompt: 'Enter the database URL for this environment',
            validateInput: (value) => {
                return value.trim() === '' ? 'Database URL cannot be empty' : null;
            },
        });

        if (!databaseUrl) {
            return;
        }

        await this.environmentManager.addEnvironment({ name, databaseUrl });
        vscode.window.showInformationMessage(`Environment "${name}" added successfully.`);
    }

    async editEnvironment(envId: string): Promise<void> {
        const env = this.environmentManager.getEnvironment(envId);
        if (!env) {
            return;
        }

        const name = await vscode.window.showInputBox({
            value: env.name,
            prompt: 'Edit environment name',
            validateInput: (value) => {
                return value.trim() === '' ? 'Environment name cannot be empty' : null;
            },
        });

        if (!name) {
            return;
        }

        const databaseUrl = await vscode.window.showInputBox({
            value: env.databaseUrl,
            prompt: 'Edit database URL',
            validateInput: (value) => {
                return value.trim() === '' ? 'Database URL cannot be empty' : null;
            },
        });

        if (!databaseUrl) {
            return;
        }

        await this.environmentManager.updateEnvironment(envId, { name, databaseUrl });
        vscode.window.showInformationMessage(`Environment "${name}" updated successfully.`);
    }

    async deleteEnvironment(envId: string): Promise<void> {
        const env = this.environmentManager.getEnvironment(envId);
        if (!env) {
            return;
        }

        const confirmDelete = await vscode.window.showWarningMessage(
            `Are you sure you want to delete the "${env.name}" environment?`,
            { modal: true },
            'Yes',
        );

        if (confirmDelete !== 'Yes') {
            return;
        }

        await this.environmentManager.deleteEnvironment(envId);
        vscode.window.showInformationMessage(`Environment "${env.name}" deleted successfully.`);
    }

    async selectEnvironment(envId?: string): Promise<void> {
        if (!envId) {
            const environments = this.environmentManager.getAllEnvironments();
            if (environments.length === 0) {
                vscode.window.showWarningMessage(
                    'No environments configured. Please add an environment first.',
                );
                return;
            }

            const items = environments.map((env) => ({
                label: env.name,
                description: env.databaseUrl,
                id: env.id,
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select an environment',
            });

            if (!selected) {
                return;
            }

            envId = selected.id;
        }

        await this.environmentManager.setCurrentEnvironment(envId);
        const env = this.environmentManager.getEnvironment(envId);
        if (env) {
            vscode.window.showInformationMessage(`Switched to environment "${env.name}".`);
        }
    }

    private async getRequiredEnvironment() {
        const env = this.environmentManager.getCurrentEnvironment();
        if (!env) {
            const setEnv = await vscode.window.showWarningMessage(
                'No environment selected. Would you like to select or create one now?',
                'Select Environment',
                'Create Environment',
            );

            if (setEnv === 'Select Environment') {
                await this.selectEnvironment();
                return this.environmentManager.getCurrentEnvironment();
            } else if (setEnv === 'Create Environment') {
                await this.addEnvironment();
                if (this.environmentManager.getAllEnvironments().length === 1) {
                    await this.environmentManager.setCurrentEnvironment(
                        this.environmentManager.getAllEnvironments()[0].id,
                    );
                } else {
                    await this.selectEnvironment();
                }
                return this.environmentManager.getCurrentEnvironment();
            }

            return null;
        }

        return env;
    }
}
