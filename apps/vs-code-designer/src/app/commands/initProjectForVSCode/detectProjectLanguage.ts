/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getProjFiles } from '../../utils/dotnetUtils';
import { ProjectLanguage } from '@microsoft-logic-apps/utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';

export async function isCSharpProject(context: IActionContext, projectPath: string): Promise<boolean> {
  return (await getProjFiles(context, ProjectLanguage.CSharp, projectPath)).length === 1;
}
