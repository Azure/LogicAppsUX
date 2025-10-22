/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { localSettingsFileName, managementApiPrefix, workflowTenantIdKey } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { getLocalSettingsJson } from '../../utils/appSettings/localSettings';
import { cacheWebviewPanel, removeWebviewPanelFromCache, tryGetWebviewPanel } from '../../utils/codeless/common';
import { getLogicAppProjectRoot } from '../../utils/codeless/connection';
import { getAuthorizationToken } from '../../utils/codeless/getAuthorizationToken';
import { getWebViewHTML } from '../../utils/codeless/getWebViewHTML';
import type { IAzureConnectorsContext } from './azureConnectorWizard';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import { readFileSync, readdirSync } from 'fs';
import { basename, dirname, join } from 'path';
import * as path from 'path';
import * as vscode from 'vscode';

export async function openRunHistory(context: IAzureConnectorsContext, workflowNode: vscode.Uri): Promise<void> {
  const programFilePath: string = workflowNode.fsPath;
  const programFileName = basename(dirname(programFilePath));
  const apiVersion = '2019-10-01-edge-preview';
  let corsNotice: string | undefined;
  const projectPath = await getLogicAppProjectRoot(context, programFilePath);
  const localSettings: Record<string, string> = projectPath
    ? (await getLocalSettingsJson(context, join(projectPath, localSettingsFileName))).Values || {}
    : {};
  const isWorkflowRuntimeRunning = !isNullOrUndefined(ext.workflowRuntimePort);
  const panelGroupKey = ext.webViewKey.runHistory;
  const workflowNames = getWorkflowNames(workflowNode.fsPath);
  const baseUrl = `http://localhost:${ext.workflowRuntimePort}${managementApiPrefix}`;
  const panelName = `${vscode.workspace.name}-${programFileName}-run-history`;
  const getAccessToken = async () => await getAuthorizationToken(localSettings[workflowTenantIdKey]);
  let accessToken = await getAccessToken();

  const existingPanel: vscode.WebviewPanel | undefined = tryGetWebviewPanel(panelGroupKey, panelName);
  if (existingPanel) {
    if (!existingPanel.active) {
      existingPanel.reveal(vscode.ViewColumn.Active);
    }

    return;
  }

  const options: vscode.WebviewOptions & vscode.WebviewPanelOptions = {
    enableScripts: true,
    retainContextWhenHidden: true,
  };

  const panel: vscode.WebviewPanel = vscode.window.createWebviewPanel(
    'workflowRunHistory',
    `${programFileName}-run-history`,
    vscode.ViewColumn.Active,
    options
  );

  panel.iconPath = {
    light: vscode.Uri.file(path.join(ext.context.extensionPath, 'assets', 'light', 'Codeless.svg')),
    dark: vscode.Uri.file(path.join(ext.context.extensionPath, 'assets', 'dark', 'Codeless.svg')),
  };

  panel.webview.html = await getWebViewHTML('vs-code-react', panel);

  let interval: NodeJS.Timeout;
  panel.webview.onDidReceiveMessage(async (message) => {
    switch (message.command) {
      case ExtensionCommand.initialize: {
        panel.webview.postMessage({
          command: ExtensionCommand.initialize_frame,
          data: {
            apiVersion: apiVersion,
            baseUrl: baseUrl,
            corsNotice,
            accessToken: accessToken,
            workflowProperties: {},
            project: ProjectName.runHistory,
            hostVersion: ext.extensionVersion,
            isLocal: true,
            isWorkflowRuntimeRunning: isWorkflowRuntimeRunning,
            workflowNames,
          },
        });
        // Just shipping the access Token every 5 seconds is easier and more
        // performant that asking for it every time and waiting.
        interval = setInterval(async () => {
          const updatedAccessToken = await getAccessToken();

          if (updatedAccessToken !== accessToken) {
            accessToken = updatedAccessToken;
            panel.webview.postMessage({
              command: ExtensionCommand.update_access_token,
              data: {
                accessToken,
              },
            });
          }
        }, 5000);
        break;
      }
      default:
        break;
    }
  }, ext.context.subscriptions);

  panel.onDidDispose(
    () => {
      removeWebviewPanelFromCache(panelGroupKey, panelName);
      clearInterval(interval);
    },
    null,
    ext.context.subscriptions
  );
  cacheWebviewPanel(panelGroupKey, panelName, panel);
}

/**
 * Extracts workflow names from a C# file by finding createConversationalWorkflow or createStatefulWorkflow calls.
 * @param filePath - The absolute path to the C# file to parse
 * @returns An array of workflow names found in the file
 */
const getWorkflowNames = (filePath: string): string[] => {
  const workflowNames: string[] = [];
  const visitedFiles = new Set<string>();
  const projectDir = dirname(filePath);

  const extractWorkflowsFromFile = (currentFilePath: string): void => {
    // Prevent circular references and re-processing
    if (visitedFiles.has(currentFilePath)) {
      return;
    }
    visitedFiles.add(currentFilePath);

    try {
      const fileContent = readFileSync(currentFilePath, 'utf8');

      // Regex to match createConversationalWorkflow or createStatefulWorkflow with flowName parameter
      // Matches patterns like: createConversationalWorkflow(flowName: "TestFlow") or createStatefulWorkflow(flowName: "TestFlow")
      // Supports both double quotes and single quotes, and handles whitespace variations
      const workflowRegex = /create(?:Conversational|Stateful)Workflow\s*\(\s*flowName\s*:\s*["']([^"']+)["']\s*\)/g;

      let match: RegExpExecArray | null;
      while ((match = workflowRegex.exec(fileContent)) !== null) {
        const flowName = match[1];
        if (flowName && !workflowNames.includes(flowName)) {
          workflowNames.push(flowName);
        }
      }

      // Find referenced .cs files in the same project
      // Match patterns like: MethodName() or ClassName.MethodName() that might be in other files
      // Look for using statements to find referenced files
      const usingRegex = /using\s+(?:static\s+)?([A-Za-z0-9_.]+)/g;
      const referencedNamespaces = new Set<string>();

      while ((match = usingRegex.exec(fileContent)) !== null) {
        referencedNamespaces.add(match[1]);
      }

      // Search for .cs files in the project directory that might contain workflow initialization
      const csFilesPattern = /(?:^|\s)(?:public\s+)?(?:static\s+)?(?:void|Task|async\s+Task)\s+\w+\s*\(/g;
      if (csFilesPattern.test(fileContent)) {
        // This file has method definitions, look for other .cs files in the directory
        try {
          const files = readdirSync(projectDir);

          for (const file of files) {
            if (file.endsWith('.cs') && file !== basename(currentFilePath)) {
              const otherFilePath = join(projectDir, file);
              extractWorkflowsFromFile(otherFilePath);
            }
          }
        } catch (dirError) {
          console.error(`Error reading directory ${projectDir}:`, dirError);
        }
      }
    } catch (error) {
      console.error(`Error reading workflow names from file ${currentFilePath}:`, error);
    }
  };

  extractWorkflowsFromFile(filePath);
  return workflowNames;
};
