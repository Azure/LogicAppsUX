/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import type { ProjectTypeOption, WorkflowTypeOption } from '../chatConstants';
import { ToolName, WorkflowTypeOption as WorkflowTypeOptionValue } from '../chatConstants';
import { WorkflowType } from '../../../constants';
import { createLogicAppProject } from '../../commands/createNewCodeProject/CodeProjectBase/CreateLogicAppProjects';
import { ProjectType, TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import * as path from 'path';
import * as fse from 'fs-extra';

/**
 * Parameters for creating a Logic App project
 */
export interface CreateProjectParams {
  projectName: string;
  projectType: ProjectTypeOption;
  workflowName?: string;
  workflowType?: WorkflowTypeOption;
  workspacePath?: string;
  createWorkspace?: boolean;
  includeCustomCode?: boolean;
  targetFramework?: string;
  functionName?: string;
  functionNamespace?: string;
}

/**
 * Result of a project operation
 */
export interface ProjectOperationResult {
  success: boolean;
  message: string;
  projectPath?: string;
  error?: string;
}

/**
 * Register project-related language model tools
 */
export function registerProjectTools(context: vscode.ExtensionContext): void {
  // Register create project tool
  context.subscriptions.push(vscode.lm.registerTool(ToolName.createProject, new CreateProjectTool()));
}

/**
 * Tool for creating a new Logic App project
 */
class CreateProjectTool implements vscode.LanguageModelTool<CreateProjectParams> {
  async invoke(
    options: vscode.LanguageModelToolInvocationOptions<CreateProjectParams>,
    _token: vscode.CancellationToken
  ): Promise<vscode.LanguageModelToolResult> {
    const { projectName } = options.input;
    const workflowName = typeof options.input.workflowName === 'string' ? options.input.workflowName.trim() : '';
    const workflowType = options.input.workflowType;

    try {
      // Validate project name
      if (!projectName || !isValidProjectName(projectName)) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            `Invalid project name "${projectName}". Project name must start with a letter and can only contain letters, digits, "_" and "-".`
          ),
        ]);
      }

      if (!workflowName && !workflowType) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            'Please specify the initial workflow name and type for this project. For example: workflowName="OrderProcessing", workflowType="stateful".'
          ),
        ]);
      }

      if (!workflowName) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            'Please specify an initial workflow name for this project (for example: workflowName="OrderProcessing").'
          ),
        ]);
      }

      if (!isValidWorkflowName(workflowName)) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            `Invalid workflow name "${workflowName}". Workflow name must start with a letter and can only contain letters, digits, "_" and "-".`
          ),
        ]);
      }

      if (!workflowType) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart('Please specify the initial workflow type: "stateful", "stateless", "agentic", or "agent".'),
        ]);
      }

      const mappedWorkflowType = mapWorkflowTypeToProjectType(workflowType);
      if (!mappedWorkflowType) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            `Invalid workflow type "${String(workflowType)}". Valid values are: stateful, stateless, agentic, agent.`
          ),
        ]);
      }

      // Create the project programmatically
      try {
        // Check if we're in a workspace - required for project creation
        if (!vscode.workspace.workspaceFile) {
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(
              `Cannot create project: you need to be in a Logic Apps workspace first. Please use the command palette (Ctrl+Shift+P) and run "Azure Logic Apps: Create new Logic App workspace".`
            ),
          ]);
        }

        const workspaceRootFolder = path.dirname(vscode.workspace.workspaceFile.fsPath);
        const logicAppFolderPath = path.join(workspaceRootFolder, projectName);

        // Check if project already exists
        if (await fse.pathExists(logicAppFolderPath)) {
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(
              `A project named "${projectName}" already exists in this workspace. Please choose a different name.`
            ),
          ]);
        }

        const projectType =
          options.input.projectType === 'rulesEngine'
            ? ProjectType.rulesEngine
            : options.input.includeCustomCode
              ? ProjectType.customCode
              : ProjectType.logicApp;

        const isCustomCodeOrRules = projectType === ProjectType.customCode || projectType === ProjectType.rulesEngine;
        const functionName = isCustomCodeOrRules ? options.input.functionName || `${projectName}Functions` : undefined;
        const functionNamespace = isCustomCodeOrRules ? options.input.functionNamespace || `${projectName}.Functions` : undefined;
        const targetFramework = options.input.targetFramework || TargetFramework.Net8;

        const projectContext: any = {
          logicAppName: projectName,
          logicAppType: projectType,
          workflowName,
          workflowType: mappedWorkflowType,
          workspaceFilePath: vscode.workspace.workspaceFile.fsPath,
          shouldCreateLogicAppProject: true,
          targetFramework: targetFramework,
          functionFolderName: functionName,
          functionName: functionName,
          functionNamespace: functionNamespace,
        };

        const actionContext: any = {
          telemetry: { properties: {}, measurements: {} },
          errorHandling: { issueProperties: {} },
          valuesToMask: [],
        };

        await createLogicAppProject(actionContext, projectContext, workspaceRootFolder);

        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(`Successfully created Logic App project "${projectName}" in the workspace.`),
        ]);
      } catch (commandError) {
        const errorMsg = commandError instanceof Error ? commandError.message : String(commandError);
        return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Failed to create project: ${errorMsg}`)]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(`Failed to create project: ${errorMessage}`)]);
    }
  }
}

/**
 * Validate project name
 * @internal Exported for testing
 */
export function isValidProjectName(name: string): boolean {
  const projectNameValidation = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
  return projectNameValidation.test(name);
}

/**
 * Validate workflow name
 * @internal Exported for testing
 */
export function isValidWorkflowName(name: string): boolean {
  const workflowNameValidation = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
  return workflowNameValidation.test(name);
}

function mapWorkflowTypeToProjectType(workflowType: WorkflowTypeOption): WorkflowType | undefined {
  switch (workflowType) {
    case WorkflowTypeOptionValue.stateful:
      return WorkflowType.stateful;
    case WorkflowTypeOptionValue.stateless:
      return WorkflowType.stateless;
    case WorkflowTypeOptionValue.agentic:
      return WorkflowType.agentic;
    case WorkflowTypeOptionValue.agent:
      return WorkflowType.agent;
    default:
      return undefined;
  }
}
