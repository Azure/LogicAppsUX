/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { projectLanguageSetting, funcVersionSetting } from '../../../constants';
import { localize } from '../../../localize';
import { initProjectForVSCode } from '../../commands/initProjectForVSCode/initProjectForVSCode';
import { tryParseFuncVersion } from '../funcCoreTools/funcVersion';
import { getWorkspaceSetting } from './settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { DialogResponses, nonNullOrEmptyValue } from '@microsoft/vscode-azext-utils';
import type { ProjectLanguage, FuncVersion } from '@microsoft/vscode-extension';

export async function verifyInitForVSCode(
  context: IActionContext,
  fsPath: string,
  language?: string,
  version?: string
): Promise<[ProjectLanguage, FuncVersion]> {
  language = language || getWorkspaceSetting(projectLanguageSetting, fsPath);
  version = tryParseFuncVersion(version || getWorkspaceSetting(funcVersionSetting, fsPath));

  if (!language || !version) {
    const message: string = localize('initFolder', 'Initialize project for use with VS Code?');
    await context.ui.showWarningMessage(message, { modal: true }, DialogResponses.yes);
    await initProjectForVSCode(context, fsPath);
    language = nonNullOrEmptyValue(getWorkspaceSetting(projectLanguageSetting, fsPath), projectLanguageSetting);
    version = nonNullOrEmptyValue(tryParseFuncVersion(getWorkspaceSetting(funcVersionSetting, fsPath)), funcVersionSetting);
  }

  return [language as ProjectLanguage, version as FuncVersion];
}
