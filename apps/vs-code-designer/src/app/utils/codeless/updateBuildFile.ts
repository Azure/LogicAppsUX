/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DotnetVersion } from '../../../constants';
import { localize } from '../../../localize';
import { getProjFiles } from '../dotnet/dotnet';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ProjectLanguage } from '@microsoft/vscode-extension';
import * as fs from 'fs';
import * as path from 'path';
import { Uri } from 'vscode';
import * as xml2js from 'xml2js';

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

export function addFolderToBuildPath(xmlBuildFile: object, folderName: string): object {
  const itemGroup: Record<string, any> = {
    None: {
      $: {
        Update: `${folderName}${path.sep}**${path.sep}*.*`,
      },
      CopyToOutputDirectory: 'PreserveNewest',
    },
  };
  xmlBuildFile['Project']['ItemGroup'].push(itemGroup);
  return xmlBuildFile;
}

export function addNugetPackagesToBuildFile(xmlBuildFile: object): object {
  const packageName = 'Microsoft.Azure.Workflows.WebJobs.Extension';
  const packageVersion = '1.2.*';
  const xmlBuildFileString = JSON.stringify(xmlBuildFile);
  if (xmlBuildFileString.indexOf(packageName) < 0) {
    const itemGroup: Record<string, any> = {
      PackageReference: {
        $: {
          Include: packageName,
          Version: packageVersion,
        },
      },
    };
    xmlBuildFile['Project']['ItemGroup'].push(itemGroup);
  }
  return xmlBuildFile;
}

export function suppressJavaScriptBuildWarnings(xmlBuildFile: object): object {
  xmlBuildFile['Project']['PropertyGroup']['MSBuildWarningsAsMessages'] = 'MSB3246;$(MSBuildWarningsAsMessages)';
  return xmlBuildFile;
}

export function updateFunctionsSDKVersion(xmlBuildFile: object, dotnetVersion: string): object {
  for (const item of xmlBuildFile['Project']['ItemGroup']) {
    if ('PackageReference' in item && item['PackageReference']['$']['Include'] == 'Microsoft.NET.Sdk.Functions') {
      const packageVersion = dotnetVersion === DotnetVersion.net6 ? '4.1.3' : '3.0.13';
      item['PackageReference']['$']['Version'] = packageVersion;
      break;
    }
  }

  return xmlBuildFile;
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
