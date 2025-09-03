/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { Site, ContainerApp } from '@azure/arm-appservice';
import type { ExtensionContext, WebviewPanel, TestController, TestItem, TestRunProfile, Uri } from 'vscode';
import type { IActionContext, IAzExtOutputChannel } from '@microsoft/vscode-azext-utils';
import type { VSCodeAzureSubscriptionProvider } from '@microsoft/vscode-azext-azureauth';
import type TelemetryReporter from '@vscode/extension-telemetry';
import type * as cp from 'child_process';

/**
 * Core extension interfaces and types
 */

export interface IExtensionVariables {
  readonly context: ExtensionContext;
  readonly outputChannel: IAzExtOutputChannel;
  readonly subscriptionProvider: VSCodeAzureSubscriptionProvider;
  readonly extensionVersion: string;
  readonly telemetryReporter?: TelemetryReporter;
}

export interface ILogicAppConfig {
  readonly name: string;
  readonly resourceGroup: string;
  readonly subscriptionId: string;
  readonly location: string;
  readonly workflowType: WorkflowType;
}

export interface IWorkflowDefinition {
  readonly definition: Record<string, unknown>;
  readonly parameters?: Record<string, unknown>;
  readonly connections?: Record<string, unknown>;
}

export interface IDeploymentConfig extends ILogicAppConfig {
  readonly projectPath: string;
  readonly workflows: IWorkflowDefinition[];
}

export interface IDeploymentResult {
  readonly success: boolean;
  readonly site?: Site;
  readonly error?: Error;
  readonly warnings?: string[];
}

export interface IValidationResult {
  readonly isValid: boolean;
  readonly errors: IValidationError[];
  readonly warnings: IValidationWarning[];
}

export interface IValidationError {
  readonly message: string;
  readonly code: string;
  readonly path?: string;
  readonly line?: number;
  readonly column?: number;
}

export interface IValidationWarning {
  readonly message: string;
  readonly code: string;
  readonly path?: string;
  readonly suggestion?: string;
}

/**
 * Workflow and project types
 */

export const WorkflowType = {
  STATEFUL: 'Stateful-Codeless',
  STATELESS: 'Stateless-Codeless',
  AGENTIC: 'Agentic-Codeless',
} as const;

export type WorkflowType = typeof WorkflowType[keyof typeof WorkflowType];

export const ProjectLanguage = {
  DOTNET: 'C#',
  JAVASCRIPT: 'JavaScript',
  TYPESCRIPT: 'TypeScript',
  POWERSHELL: 'PowerShell',
} as const;

export type ProjectLanguage = typeof ProjectLanguage[keyof typeof ProjectLanguage];

export const FunctionVersion = {
  V4: '~4',
  V3: '~3',
} as const;

export type FunctionVersion = typeof FunctionVersion[keyof typeof FunctionVersion];

/**
 * Tree view and UI types
 */

export interface ILogicAppTreeItem {
  readonly id: string;
  readonly label: string;
  readonly resourceGroup: string;
  readonly subscriptionId: string;
  readonly site?: Site;
  readonly containerApp?: ContainerApp;
}

export interface IWorkflowTreeItem {
  readonly name: string;
  readonly workflowType: WorkflowType;
  readonly enabled: boolean;
  readonly lastModified?: Date;
}

/**
 * Service interfaces
 */

export interface ILogicAppService {
  deploy(config: IDeploymentConfig): Promise<IDeploymentResult>;
  validate(workflow: IWorkflowDefinition): Promise<IValidationResult>;
  getLogicApps(subscriptionId: string, resourceGroup?: string): Promise<Site[]>;
  deleteLogicApp(subscriptionId: string, resourceGroup: string, name: string): Promise<void>;
}

export interface IWorkflowService {
  createWorkflow(name: string, workflowType: WorkflowType, projectPath: string): Promise<void>;
  openWorkflow(workflowPath: string): Promise<void>;
  validateWorkflow(workflowPath: string): Promise<IValidationResult>;
  exportWorkflow(workflowPath: string, targetPath: string): Promise<void>;
}

export interface IFileService {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  copyFile(source: string, destination: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  createDirectory(path: string): Promise<void>;
}

/**
 * Command context types
 */

export interface ICommandContext extends IActionContext {
  readonly workspaceFolder?: Uri;
  readonly selectedItem?: ILogicAppTreeItem | IWorkflowTreeItem;
}

export interface IWizardContext extends IActionContext {
  readonly step: number;
  readonly totalSteps: number;
  readonly canGoBack: boolean;
  readonly canGoNext: boolean;
}

/**
 * Error types
 */

export abstract class BaseExtensionError extends Error {
  abstract readonly code: string;
  abstract readonly severity: 'error' | 'warning' | 'info';
  
  constructor(message: string, public override readonly cause?: Error) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends BaseExtensionError {
  readonly code = 'VALIDATION_ERROR';
  readonly severity = 'error' as const;
}

export class DeploymentError extends BaseExtensionError {
  readonly code = 'DEPLOYMENT_ERROR';
  readonly severity = 'error' as const;
}

export class AuthenticationError extends BaseExtensionError {
  readonly code = 'AUTHENTICATION_ERROR';
  readonly severity = 'error' as const;
}

export class UserCancellationError extends BaseExtensionError {
  readonly code = 'USER_CANCELLED';
  readonly severity = 'info' as const;
}

export class ConfigurationError extends BaseExtensionError {
  readonly code = 'CONFIGURATION_ERROR';
  readonly severity = 'error' as const;
}

/**
 * WebView and panel types
 */

export interface IWebViewManager {
  createPanel(viewType: string, title: string, options?: IWebViewOptions): WebviewPanel;
  getPanel(viewType: string): WebviewPanel | undefined;
  disposePanel(viewType: string): void;
  dispose(): void;
}

export interface IWebViewOptions {
  readonly retainContextWhenHidden?: boolean;
  readonly enableScripts?: boolean;
  readonly localResourceRoots?: Uri[];
}

/**
 * Azure resource types
 */

export interface IAzureSubscription {
  readonly subscriptionId: string;
  readonly displayName: string;
  readonly tenantId: string;
}

export interface IAzureResourceGroup {
  readonly name: string;
  readonly location: string;
  readonly subscriptionId: string;
}

/**
 * Testing types
 */

export interface ITestData {
  readonly testController: TestController;
  readonly testRunProfile: TestRunProfile;
  readonly testItems: Map<string, TestItem>;
}

export interface ITestConfiguration {
  readonly projectPath: string;
  readonly testPattern: string;
  readonly timeout: number;
  readonly parallel: boolean;
}

/**
 * Design-time API types
 */

export interface IDesignTimeInstance {
  readonly process?: cp.ChildProcess;
  readonly childFuncPid?: string;
  readonly port?: number;
  readonly isStarting?: boolean;
}

export interface IDesignTimeConfig {
  readonly workflowName: string;
  readonly projectPath: string;
  readonly port: number;
  readonly debugMode: boolean;
}

/**
 * Data mapper types
 */

export interface IDataMapperPanel {
  readonly viewType: string;
  readonly title: string;
  readonly panel: WebviewPanel;
  readonly mapName: string;
}

export interface IDataMapperConfig {
  readonly sourceSchema: string;
  readonly targetSchema: string;
  readonly mapDefinition?: Record<string, unknown>;
}

/**
 * Bundle and extension management types
 */

export interface IBundleVersion {
  readonly version: string;
  readonly isPinned: boolean;
  readonly isDefault: boolean;
  readonly downloadUrl: string;
}

export interface IExtensionDependency {
  readonly name: string;
  readonly version: string;
  readonly required: boolean;
  readonly downloadUrl?: string;
}
