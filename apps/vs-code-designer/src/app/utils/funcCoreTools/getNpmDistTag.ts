/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../localize';
import { parseJson } from '../parseJson';
import { sendRequestWithExtTimeout } from '../requestUtils';
import { tryGetMajorVersion } from './funcVersion';
import { HTTP_METHODS } from '@microsoft/logic-apps-designer';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { FuncVersion, INpmDistTag, IPackageMetadata } from '@microsoft/vscode-extension';
import * as semver from 'semver';

/**
 * Gets distribution tag of functions core tools npm package.
 * @param {IActionContext} context - Command context.
 * @param {FuncVersion} version - Functions core tools version.
 * @returns {Promise<INpmDistTag>} Returns core tools version to install.
 */
export async function getNpmDistTag(context: IActionContext, version: FuncVersion): Promise<INpmDistTag> {
  const npmRegistryUri = 'https://aka.ms/AA2qmnu';
  const response = await sendRequestWithExtTimeout(context, { url: npmRegistryUri, method: HTTP_METHODS.GET });

  const packageMetadata: IPackageMetadata = parseJson(response.bodyAsText);
  const majorVersion: string = tryGetMajorVersion(version);

  const validVersions: string[] = Object.keys(packageMetadata.versions).filter((v: string) => !!semver.valid(v));
  const maxVersion: string | null = semver.maxSatisfying(validVersions, majorVersion);

  if (!maxVersion) {
    throw new Error(localize('noDistTag', 'Failed to retrieve NPM tag for version "{0}".', version));
  }
  return { tag: majorVersion, value: maxVersion };
}
