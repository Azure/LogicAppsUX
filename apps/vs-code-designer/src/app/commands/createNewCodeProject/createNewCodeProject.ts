/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createNewProjectInternalBase } from './CodeProjectBase/CreateNewProjectInternal';
import { OpenBehaviorStep } from '../createNewProject/OpenBehaviorStep';
import { FolderListStep } from '../createNewProject/createProjectSteps/FolderListStep';
import { NewCodeProjectTypeStep } from './CodeProjectBase/NewCodeProjectTypeStep';
import { SetWorkspaceSettings } from './CodeProjectBase/SetWorkspaceSettings';
import { SetLogicAppName } from './CodeProjectBase/SetLogicAppNameStep';
import { SetWorkspaceName } from './CodeProjectBase/SetWorkspaceName';
import { SetLogicAppType } from './CodeProjectBase/setLogicAppType';
import { isString } from '@microsoft/logic-apps-shared';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { ProjectLanguage, ProjectVersion } from '@microsoft/vscode-extension-logic-apps';
import { TargetFrameworkStep } from './createCodeProjectSteps/createFunction/TargetFrameworkStep';

export async function createNewCodeProjectFromCommand(
  context: IActionContext,
  folderPath?: string | undefined,
  language?: ProjectLanguage,
  version?: ProjectVersion,
  openFolder = true,
  templateId?: string,
  functionName?: string,
  functionSettings?: { [key: string]: string | undefined }
): Promise<void> {
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
    'createNewCodeProject',
    'Create new logic app workspace',
    [
      new FolderListStep(),
      new SetWorkspaceName(),
      new SetLogicAppType(),
      new TargetFrameworkStep(),
      new SetLogicAppName(),
      new NewCodeProjectTypeStep(templateId, functionSettings, false),
      new SetWorkspaceSettings(),
      new OpenBehaviorStep(),
    ]
  );
}
