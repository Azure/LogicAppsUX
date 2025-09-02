/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createProjectInternal } from '../createWorkspace/createWorkspaceSteps/createProjectInternal';
import { ExistingWorkspaceStep } from './createProjectSteps/existingWorkspaceStep';
import { LogicAppTemplateStep } from './createProjectSteps/logicAppTemplateStep';
import { LogicAppNameStep } from '../createWorkspace/createWorkspaceSteps/logicAppNameStep';
import { TargetFrameworkStep } from './createCustomCodeProjectSteps/targetFrameworkStep';
import { ProjectTypeStep } from '../createWorkspace/createWorkspaceSteps/projectTypeStep';
import { WorkspaceSettingsStep } from '../createWorkspace/createWorkspaceSteps/workspaceSettingsStep';
import { isString } from '@microsoft/logic-apps-shared';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { ProjectLanguage, ProjectVersion } from '@microsoft/vscode-extension-logic-apps';
import { convertToWorkspace } from '../convertToWorkspace';

// TODO(aeldridge): TargetFrameworkStep should be in a subwizard on LogicAppTemplateStep
export async function createProject(
  context: IActionContext,
  folderPath?: string | undefined,
  language?: ProjectLanguage,
  version?: ProjectVersion,
  openFolder = true,
  templateId?: string,
  functionName?: string,
  functionSettings?: { [key: string]: string | undefined }
): Promise<void> {
  if (await convertToWorkspace(context)) {
    await createProjectInternal(
      context,
      {
        folderPath: isString(folderPath) ? folderPath : undefined,
        templateId,
        functionName,
        functionSettings,
        suppressOpenFolder: !openFolder,
        language,
        version,
      },
      'createProject',
      'Create new project',
      [
        new ExistingWorkspaceStep(),
        new LogicAppTemplateStep(),
        new TargetFrameworkStep(),
        new LogicAppNameStep(),
        new ProjectTypeStep(templateId, functionSettings, false),
        new WorkspaceSettingsStep(),
      ]
    );
  }
}
