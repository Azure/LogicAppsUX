/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../localize';
import { getProjFiles } from '../dotnetUtils';
import { ProjectLanguage } from '@microsoft-logic-apps/utils';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as fs from 'fs';
import * as path from 'path';
import { Uri } from 'vscode';
import * as xml2js from 'xml2js';

export async function addNewFileInCSharpProject(context: IActionContext, filePathToAdd: string, projectPath: string): Promise<void> {
  return addPathInCSharpProject(context, projectPath, filePathToAdd);
}

export async function getDotnetBuildFile(context: IActionContext, projectPath: string): Promise<string> {
  const projectFiles = await getProjFiles(context, ProjectLanguage.CSharp, projectPath);
  const projFileName: string | undefined = projectFiles.length === 1 ? projectFiles[0].name : undefined;
  if (projFileName) {
    const buildFileUri: Uri = Uri.file(path.join(projectPath, projFileName));
    const xmlString: string = fs.readFileSync(buildFileUri.fsPath, 'utf8').toString();
    const xmlObject: object | undefined = await getXMLString(xmlString, { explicitArray: false });
    return JSON.stringify(xmlObject);
  } else {
    throw new Error(localize('dotnetProjectFileNotFound', 'Dotnet project file could not be found.'));
  }
}

export async function writeBuildFileToDisk(context: IActionContext, xmlObject: object, projectPath: string): Promise<void> {
  const projectFiles = await getProjFiles(context, ProjectLanguage.CSharp, projectPath);
  const projFileName: string | undefined = projectFiles.length === 1 ? projectFiles[0].name : undefined;
  if (projFileName) {
    const builder: xml2js.Builder = new xml2js.Builder();
    const xml: string = builder.buildObject(xmlObject);
    const newProjFile: Uri = Uri.file(path.join(projectPath, projFileName));
    fs.writeFileSync(newProjFile.fsPath, xml);
  } else {
    throw new Error(localize('dotnetProjectFileNotFound', 'Dotnet project file could not be found.'));
  }
}

export async function getXMLString(csproj: string, options: any): Promise<object | undefined> {
  return await new Promise((resolve: (ret: object | undefined) => void): void => {
    // tslint:disable-next-line:no-any
    xml2js.parseString(csproj, options, (err: any, result: any): void => {
      if (result && !err) {
        resolve(result);
      }
      resolve(undefined);
    });
  });
}

async function addPathInCSharpProject(context: IActionContext, projectPath: string, pathToAdd: string): Promise<void> {
  let xmlBuildFile: any = await getDotnetBuildFile(context, projectPath);
  xmlBuildFile = JSON.parse(xmlBuildFile);
  const itemGroupToAdd: Record<string, any> = {
    None: {
      $: {
        Update: pathToAdd,
      },
      CopyToOutputDirectory: 'PreserveNewest',
    },
  };
  // tslint:disable-next-line: no-string-literal
  xmlBuildFile['Project']['ItemGroup'].push(itemGroupToAdd);
  await writeBuildFileToDisk(context, xmlBuildFile, projectPath);
}
