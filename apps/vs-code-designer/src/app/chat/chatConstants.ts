/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Chat participant constants
 */
export const CHAT_PARTICIPANT_ID = 'vscode-azurelogicapps.logicapps';
export const CHAT_PARTICIPANT_NAME = 'logicapps';
export const CHAT_PARTICIPANT_FULL_NAME = 'Azure Logic Apps';
export const CHAT_PARTICIPANT_DESCRIPTION = 'Create and manage Logic Apps workflows';

/**
 * Chat commands (slash commands)
 */
export const ChatCommand = {
  createWorkflow: 'createWorkflow',
  createProject: 'createProject',
  modifyAction: 'modifyAction',
  help: 'help',
} as const;
export type ChatCommand = (typeof ChatCommand)[keyof typeof ChatCommand];

/**
 * Tool names for language model tools
 */
export const ToolName = {
  createWorkflow: 'logicapps_createWorkflow',
  createProject: 'logicapps_createProject',
  listWorkflows: 'logicapps_listWorkflows',
  getWorkflowDefinition: 'logicapps_getWorkflowDefinition',
  addAction: 'logicapps_addAction',
  modifyAction: 'logicapps_modifyAction',
  deleteAction: 'logicapps_deleteAction',
} as const;
export type ToolName = (typeof ToolName)[keyof typeof ToolName];

/**
 * Workflow types available for creation
 */
export const WorkflowTypeOption = {
  stateful: 'stateful',
  stateless: 'stateless',
  agentic: 'agentic',
  agent: 'agent',
} as const;
export type WorkflowTypeOption = (typeof WorkflowTypeOption)[keyof typeof WorkflowTypeOption];

/**
 * Project types for Logic App projects
 */
export const ProjectTypeOption = {
  logicApp: 'logicApp',
  logicAppCustomCode: 'logicAppCustomCode',
  rulesEngine: 'rulesEngine',
} as const;
export type ProjectTypeOption = (typeof ProjectTypeOption)[keyof typeof ProjectTypeOption];

/**
 * Target framework options for custom code projects
 */
export const TargetFrameworkOption = {
  net8: 'net8',
  netFx: 'net472',
} as const;
export type TargetFrameworkOption = (typeof TargetFrameworkOption)[keyof typeof TargetFrameworkOption];
