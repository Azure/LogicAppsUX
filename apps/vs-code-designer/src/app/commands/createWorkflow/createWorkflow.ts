/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { projectTemplateKeySetting } from '../../../constants';
import { getProjFiles } from '../../utils/dotnet/dotnet';
import { addLocalFuncTelemetry, checkSupportedFuncVersion } from '../../utils/funcCoreTools/funcVersion';
import { verifyAndPromptToCreateProject } from '../../utils/verifyIsProject';
import { getWorkspaceSetting } from '../../utils/vsCodeConfig/settings';
import { verifyInitForVSCode } from '../../utils/vsCodeConfig/verifyInitForVSCode';
import { getContainingWorkspace, getWorkspaceFolder } from '../../utils/workspace';

import { isNullOrUndefined, isString } from '@microsoft/logic-apps-shared';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { AzureWizard } from '@microsoft/vscode-azext-utils';
import type { IFunctionWizardContext, FuncVersion } from '@microsoft/vscode-extension-logic-apps';
import { ProjectLanguage, WorkflowProjectType } from '@microsoft/vscode-extension-logic-apps';
import type { WorkspaceFolder } from 'vscode';
import { WorkflowStateTypeStep } from '../createCodeless/createCodelessSteps/WorkflowStateTypeStep';
import { WorkflowCodeTypeStep } from './WorkflowCodeTypeStep';

export async function createWorkflow(
  context: IActionContext,
  workspacePath?: string | undefined,
  templateId?: string,
  logicAppName?: string,
  triggerSettings?: { [key: string]: string | undefined },
  language?: ProjectLanguage,
  version?: FuncVersion
): Promise<void> {
  addLocalFuncTelemetry(context);
  let workspaceFolder: WorkspaceFolder | string | undefined;

  workspacePath = isString(workspacePath) ? workspacePath : undefined;
  if (workspacePath === undefined) {
    workspaceFolder = await getWorkspaceFolder(context);
    workspacePath = isNullOrUndefined(workspaceFolder)
      ? undefined
      : isString(workspaceFolder)
        ? workspaceFolder
        : workspaceFolder.uri.fsPath;
  } else {
    workspaceFolder = getContainingWorkspace(workspacePath);
  }

  const projectPath: string | undefined = await verifyAndPromptToCreateProject(context, workspacePath);
  if (!projectPath) {
    return;
  }

  let workflowProjectType: WorkflowProjectType = WorkflowProjectType.Bundle;
  const projectFiles = await getProjFiles(context, ProjectLanguage.CSharp, projectPath);
  if (projectFiles.length > 0) {
    workflowProjectType = WorkflowProjectType.Nuget;
  }

  [language, version] = await verifyInitForVSCode(context, projectPath, language, version);

  checkSupportedFuncVersion(version);

  const projectTemplateKey: string | undefined = getWorkspaceSetting(projectTemplateKeySetting, projectPath);
  const wizardContext: IFunctionWizardContext = Object.assign(context, {
    projectPath,
    workspacePath,
    workspaceFolder,
    version,
    language,
    functionName: logicAppName,
    workflowProjectType,
    projectTemplateKey,
  });

  // wizardContext.isCodeless = true; // default to codeless workflow, disabling codeful option until Public Preview

  const wizard: AzureWizard<IFunctionWizardContext> = new AzureWizard(wizardContext, {
    promptSteps: [
      await WorkflowCodeTypeStep.create(wizardContext, { templateId, triggerSettings, isProjectWizard: false }),
      await WorkflowStateTypeStep.create(wizardContext, { templateId, triggerSettings, isProjectWizard: false }),
    ],
  });

  await wizard.prompt();
  await wizard.execute();
}
