/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { projectLanguageSetting, funcVersionSetting } from '../../../constants';
import * as path from 'path';
import * as fse from 'fs-extra';
import { localize } from '../../../localize';
import { initProjectForVSCode } from '../../commands/initProjectForVSCode/initProjectForVSCode';
import { tryParseFuncVersion } from '../funcCoreTools/funcVersion';
import { getWorkspaceSetting } from './settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { DialogResponses, nonNullOrEmptyValue } from '@microsoft/vscode-azext-utils';
import type { ProjectLanguage, FuncVersion } from '@microsoft/vscode-extension-logic-apps';
import { ext } from '../../../extensionVariables';

/**
 * Verifies vscode workspace is initialized for a Logic App project.
 * @param {IActionContext} context - Command context.
 * @param {ProjectLanguage} fsPath - Workspace path.
 * @param {string} language - Language from project.
 * @param {string} version - Functions core tools version.
 * @returns {Promise<ProjectFile[]>} Array of files.
 */
export async function verifyInitForVSCode(
  context: IActionContext,
  fsPath: string,
  language?: string,
  version?: string
): Promise<[ProjectLanguage, FuncVersion]> {
  let settings: { [key: string]: any } = {};
  const settingsPath = path.join(fsPath, '.vscode', 'settings.json');
  if (await fse.pathExists(settingsPath)) {
    settings = JSON.parse(await fse.readFile(settingsPath, 'utf8'));
  }
  language = language || getWorkspaceSetting(projectLanguageSetting, fsPath) || settings[`${ext.prefix}.${projectLanguageSetting}`];
  version = tryParseFuncVersion(
    version || getWorkspaceSetting(funcVersionSetting, fsPath) || tryParseFuncVersion(settings[`${ext.prefix}.${funcVersionSetting}`])
  );

  if (!language || !version) {
    const message: string = localize('initFolder', 'Initialize project for use with VS Code?');
    await context.ui.showWarningMessage(message, { modal: true }, DialogResponses.yes);
    await initProjectForVSCode(context, fsPath);
    language = nonNullOrEmptyValue(getWorkspaceSetting(projectLanguageSetting, fsPath), projectLanguageSetting);
    version = nonNullOrEmptyValue(tryParseFuncVersion(getWorkspaceSetting(funcVersionSetting, fsPath)), funcVersionSetting);
  }

  return [language as ProjectLanguage, version as FuncVersion];
}
