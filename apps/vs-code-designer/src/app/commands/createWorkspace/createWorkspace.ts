/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createProjectInternal } from '../createProject/createProjectInternal';
import { OpenBehaviorStep } from './createWorkspaceSteps/openBehaviorStep';
import { WorkspaceFolderStep } from './createWorkspaceSteps/workspaceFolderStep';
import { ProjectTypeStep } from '../createProject/createProjectSteps/projectTypeStep';
import { WorkspaceSettingsStep } from './createWorkspaceSteps/workspaceSettingsStep';
import { LogicAppNameStep } from '../createProject/createProjectSteps/logicAppNameStep';
import { WorkspaceNameStep } from './createWorkspaceSteps/workspaceNameStep';
import { isString } from '@microsoft/logic-apps-shared';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { ProjectLanguage, ProjectVersion } from '@microsoft/vscode-extension-logic-apps';
import { TargetFrameworkStep } from '../createProject/createCustomCodeProjectSteps/targetFrameworkStep';
import { LogicAppTemplateStep } from '../createProject/createProjectSteps/logicAppTemplateStep';
import { DevcontainerStep } from './createWorkspaceSteps/devcontainerStep';

// TODO(aeldridge): TargetFrameworkStep should be in a subwizard on LogicAppTemplateStep
export async function createWorkspace(
  context: IActionContext,
  folderPath?: string | undefined,
  language?: ProjectLanguage,
  version?: ProjectVersion,
  openFolder = true,
  templateId?: string,
  functionName?: string,
  functionSettings?: { [key: string]: string | undefined }
): Promise<void> {
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
    'createWorkspace',
    'Create new logic app workspace',
    [
      new WorkspaceFolderStep(),
      new WorkspaceNameStep(),
      new DevcontainerStep(),
      new LogicAppTemplateStep(),
      new TargetFrameworkStep(),
      new LogicAppNameStep(),
      await ProjectTypeStep.create(context, templateId, functionSettings, false),
      new WorkspaceSettingsStep(),
      new OpenBehaviorStep(),
    ]
  );
}
