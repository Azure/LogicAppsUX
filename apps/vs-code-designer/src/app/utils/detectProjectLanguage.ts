/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getProjFiles } from './dotnet/dotnet';
import { ProjectLanguage } from '@microsoft/vscode-extension-logic-apps';

export async function isCSharpProject(projectPath: string): Promise<boolean> {
  return (await getProjFiles(ProjectLanguage.CSharp, projectPath)).length === 1;
}
