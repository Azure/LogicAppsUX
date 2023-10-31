/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { projectLanguageSetting, funcVersionSetting, showProjectWarningSetting } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { initProjectForVSCode } from '../../commands/initProjectForVSCode/initProjectForVSCode';
import { tryParseFuncVersion } from '../funcCoreTools/funcVersion';
import { tryGetFunctionProjectRoot } from '../verifyIsProject';
import { getWorkspaceSetting, updateGlobalSetting } from './settings';
import { verifyTargetFramework } from './verifyTargetFramework';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { callWithTelemetryAndErrorHandling, DialogResponses } from '@microsoft/vscode-azext-utils';
import type { FuncVersion } from '@microsoft/vscode-extension';
import { ProjectLanguage } from '@microsoft/vscode-extension';
import * as path from 'path';
import type { WorkspaceFolder, MessageItem } from 'vscode';

export async function verifyVSCodeConfigOnActivate(
  context: IActionContext,
  folders: ReadonlyArray<WorkspaceFolder> | undefined
): Promise<void> {
  context.telemetry.suppressIfSuccessful = true;
  context.telemetry.properties.isActivationEvent = 'true';
  context.errorHandling.suppressDisplay = true;

  if (folders) {
    for (const folder of folders) {
      const workspacePath: string = folder.uri.fsPath;
      const projectPath: string | undefined = await tryGetFunctionProjectRoot(context, folder);

      if (projectPath) {
        ext.logicAppWorkspace = projectPath;
        context.telemetry.suppressIfSuccessful = false;

        const language: ProjectLanguage | undefined = getWorkspaceSetting(projectLanguageSetting, projectPath);
        const version: FuncVersion | undefined = tryParseFuncVersion(getWorkspaceSetting(funcVersionSetting, projectPath));

        if (language !== undefined && version !== undefined) {
          callWithTelemetryAndErrorHandling('initializeTemplates', async (templatesContext: IActionContext) => {
            templatesContext.telemetry.properties.isActivationEvent = 'true';
            templatesContext.errorHandling.suppressDisplay = true;
          });

          const projectLanguage: string | undefined = getWorkspaceSetting(projectLanguageSetting, workspacePath);
          context.telemetry.properties.projectLanguage = projectLanguage;
          switch (projectLanguage) {
            case ProjectLanguage.CSharp:
              await verifyTargetFramework(projectLanguage, folder, projectPath, context);
              break;
            default:
          }
        } else {
          await promptToInitializeProject(workspacePath, context);
        }
      }
    }
  }
}

async function promptToInitializeProject(workspacePath: string, context: IActionContext): Promise<void> {
  if (getWorkspaceSetting<boolean>(showProjectWarningSetting)) {
    context.telemetry.properties.verifyConfigPrompt = 'initProject';

    const learnMoreLink = 'https://aka.ms/azFuncProject';
    const message: string = localize(
      'uninitializedWarning',
      'Detected an Azure Logic App Project in folder "{0}" that may have been created outside of VS Code. Initialize for optimal use with VS Code?',
      path.basename(workspacePath)
    );
    const result: MessageItem = await context.ui.showWarningMessage(
      message,
      { learnMoreLink },
      DialogResponses.yes,
      DialogResponses.dontWarnAgain
    );
    if (result === DialogResponses.dontWarnAgain) {
      context.telemetry.properties.verifyConfigResult = 'dontWarnAgain';
      await updateGlobalSetting(showProjectWarningSetting, false);
    } else {
      context.telemetry.properties.verifyConfigResult = 'update';
      await initProjectForVSCode(context, workspacePath);
    }
  } else {
    context.telemetry.properties.verifyConfigResult = 'suppressed';
  }
}
