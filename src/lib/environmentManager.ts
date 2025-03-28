import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { EXTENSION_NAME } from './constants';

export interface Environment {
    id: string;
    name: string;
    databaseUrl: string;
}

export class EnvironmentManager {
    private environments: Environment[] = [];
    private currentEnvironmentId: string | undefined;
    private readonly ENVIRONMENTS_KEY = `${EXTENSION_NAME}.environments`;
    private readonly CURRENT_ENV_KEY = `${EXTENSION_NAME}.currentEnvironment`;
    private environmentChangedEmitter = new vscode.EventEmitter<void>();

    constructor(
        private workspaceStorage: vscode.Memento,
        private globalStorage: vscode.Memento,
    ) {
        // Try to load from workspace storage first
        this.environments = this.workspaceStorage.get<Environment[]>(this.ENVIRONMENTS_KEY) || [];
        this.currentEnvironmentId = this.workspaceStorage.get<string>(this.CURRENT_ENV_KEY);

        // If no environments in workspace storage, check if there are any in global storage
        // and migrate them to workspace storage
        if (this.environments.length === 0) {
            const globalEnvironments =
                this.globalStorage.get<Environment[]>(this.ENVIRONMENTS_KEY) || [];
            if (globalEnvironments.length > 0) {
                this.environments = globalEnvironments;
                this.currentEnvironmentId = this.globalStorage.get<string>(this.CURRENT_ENV_KEY);

                // Save to workspace storage
                this.saveEnvironments();
                if (this.currentEnvironmentId) {
                    this.workspaceStorage.update(this.CURRENT_ENV_KEY, this.currentEnvironmentId);
                }

                // Clean up global storage
                this.globalStorage.update(this.ENVIRONMENTS_KEY, undefined);
                this.globalStorage.update(this.CURRENT_ENV_KEY, undefined);

                vscode.window.showInformationMessage(
                    'SQLX Manager: Migrated environments from global to workspace storage.',
                );
            }
        }
    }

    get onEnvironmentChanged() {
        return this.environmentChangedEmitter.event;
    }

    getAllEnvironments(): Environment[] {
        return [...this.environments];
    }

    getEnvironment(id: string): Environment | undefined {
        return this.environments.find((env) => env.id === id);
    }

    getCurrentEnvironment(): Environment | undefined {
        if (!this.currentEnvironmentId) {
            return undefined;
        }
        return this.environments.find((env) => env.id === this.currentEnvironmentId);
    }

    async createEnvironment(env: Omit<Environment, 'id'>): Promise<Environment> {
        const newEnv: Environment = {
            id: uuidv4(),
            ...env,
        };

        this.environments.push(newEnv);
        await this.saveEnvironments();

        // If this is the first environment, set it as current
        if (this.environments.length === 1) {
            await this.setCurrentEnvironment(newEnv.id);
        }

        return newEnv;
    }

    async updateEnvironment(
        id: string,
        env: Omit<Environment, 'id'>,
    ): Promise<Environment | undefined> {
        const index = this.environments.findIndex((e) => e.id === id);
        if (index === -1) {
            return undefined;
        }

        const updatedEnv: Environment = {
            id,
            ...env,
        };

        this.environments[index] = updatedEnv;
        await this.saveEnvironments();
        this.environmentChangedEmitter.fire();

        return updatedEnv;
    }

    async deleteEnvironment(id: string): Promise<boolean> {
        const index = this.environments.findIndex((e) => e.id === id);
        if (index === -1) {
            return false;
        }

        this.environments.splice(index, 1);

        // If the current environment is deleted, unset it
        if (this.currentEnvironmentId === id) {
            this.currentEnvironmentId = undefined;
            await this.workspaceStorage.update(this.CURRENT_ENV_KEY, undefined);
        }

        await this.saveEnvironments();
        this.environmentChangedEmitter.fire();

        return true;
    }

    async setCurrentEnvironment(id: string): Promise<boolean> {
        const env = this.environments.find((e) => e.id === id);
        if (!env) {
            return false;
        }

        this.currentEnvironmentId = id;
        await this.workspaceStorage.update(this.CURRENT_ENV_KEY, id);
        this.environmentChangedEmitter.fire();

        return true;
    }

    private async saveEnvironments(): Promise<void> {
        await this.workspaceStorage.update(this.ENVIRONMENTS_KEY, this.environments);
    }
}
