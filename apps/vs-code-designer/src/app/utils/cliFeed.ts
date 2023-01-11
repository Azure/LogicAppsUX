/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { getJsonFeed } from './feed';
import { tryGetMajorVersion } from './funcCoreTools/funcVersion';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { FuncVersion } from '@microsoft/vscode-extension';
import { TemplateSource } from '@microsoft/vscode-extension';

const funcCliFeedV4Url = 'https://aka.ms/V00v5v';

interface ICliFeed {
  tags: {
    [tag: string]: ITag | undefined;
  };
  releases: {
    [version: string]: IRelease;
  };
}

export interface IRelease {
  templates: string;
  workerRuntimes: {
    dotnet: {
      [key: string]: IWorkerRuntime;
    };
  };
}

export interface IWorkerRuntime {
  displayInfo: {
    displayName: string;
    description?: string;
    hidden: boolean;
  };
  sdk: {
    name: string;
  };
  targetFramework: string;
  itemTemplates: string;
  projectTemplates: string;
  projectTemplateId: {
    csharp: string;
  };
}

interface ITag {
  release: string;
  displayName: string;
  hidden: boolean;
}

export async function getLatestVersion(context: IActionContext, version: FuncVersion): Promise<string> {
  const cliFeed: ICliFeed = await getCliFeed(context);

  const majorVersion: string = tryGetMajorVersion(version);
  let tag: string = 'v' + majorVersion;
  const templateProvider = ext.templateProvider.get(context);
  if (templateProvider.templateSource === TemplateSource.Staging) {
    const newTag = tag + '-prerelease';
    if (cliFeed.tags[newTag]) {
      tag = newTag;
    } else {
      ext.outputChannel.appendLog(
        localize(
          'versionWithoutStaging',
          'WARNING: Azure Functions v{0} does not support the staging template source. Using default template source instead.',
          majorVersion
        )
      );
    }
  }

  const releaseData = cliFeed.tags[tag];
  if (!releaseData) {
    throw new Error(localize('unsupportedVersion', 'Azure Functions v{0} does not support this operation.', majorVersion));
  }
  return releaseData.release;
}

export async function getRelease(context: IActionContext, templateVersion: string): Promise<IRelease> {
  const cliFeed: ICliFeed = await getCliFeed(context);
  return cliFeed.releases[templateVersion];
}

async function getCliFeed(context: IActionContext): Promise<ICliFeed> {
  return getJsonFeed(context, funcCliFeedV4Url);
}
