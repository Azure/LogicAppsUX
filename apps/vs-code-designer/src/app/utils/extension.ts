/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { logicAppsStandardExtensionId } from '../../constants';
import * as vscode from 'vscode';

/**
 * Gets extension version from the package.json version.
 * @returns {string} Extension version.
 */
export const getExtensionVersion = (): string => {
  const extension = vscode.extensions.getExtension(logicAppsStandardExtensionId);

  if (extension) {
    const { packageJSON } = extension;

    if (packageJSON) {
      const version = packageJSON.version;
      return version;
    }
  }

  return '';
};

export async function getPublicUrl(url: string) {
  const local = vscode.Uri.parse(url);
  const external = await vscode.env.asExternalUri(local);
  return external.toString(); // use this in webviews, auth callbacks, logs, etc.
}
