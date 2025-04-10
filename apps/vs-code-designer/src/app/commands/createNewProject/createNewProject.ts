/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createNewProjectInternalBase } from '../createNewCodeProject/CodeProjectBase/CreateNewProjectInternal';
import { ExistingWorkspaceStep } from './createProjectSteps/ExistingWorkspaceStep';
import { NewProjectLogicAppTypeStep } from './createProjectSteps/NewProjectLogicAppTypeStep';
import { LogicAppNameStep } from '../createNewCodeProject/CodeProjectBase/LogicAppNameStep';
import { TargetFrameworkStep } from '../createNewCodeProject/createCodeProjectSteps/createFunction/TargetFrameworkStep';
import { NewCodeProjectTypeStep } from '../createNewCodeProject/CodeProjectBase/NewCodeProjectTypeStep';
import { WorkspaceSettingsStep } from '../createNewCodeProject/CodeProjectBase/WorkspaceSettingsStep';
import { isString } from '@microsoft/logic-apps-shared';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { ProjectLanguage, ProjectVersion } from '@microsoft/vscode-extension-logic-apps';
import { convertToWorkspace } from '../createNewCodeProject/CodeProjectBase/ConvertToWorkspace';

export async function createNewProjectFromCommand(
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
    await createNewProjectInternalBase(
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
      'createNewProject',
      'Create new project',
      [
        new ExistingWorkspaceStep(),
        new NewProjectLogicAppTypeStep(),
        new TargetFrameworkStep(),
        new LogicAppNameStep(),
        new NewCodeProjectTypeStep(templateId, functionSettings, false),
        new WorkspaceSettingsStep(),
      ]
    );
  }
}
