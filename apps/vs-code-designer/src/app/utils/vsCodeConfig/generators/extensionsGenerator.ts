/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { csDevKitExtensionId, dotnetExtensionId, functionsExtensionId, logicAppsStandardExtensionId } from '../../../../constants';

export interface ExtensionsJsonContent {
  recommendations: string[];
}

/**
 * Generates the canonical extensions.json content for a Logic App project.
 */
export function generateExtensionsJson(): ExtensionsJsonContent {
  const recommendations: string[] = [logicAppsStandardExtensionId, functionsExtensionId, dotnetExtensionId, csDevKitExtensionId];
  return { recommendations };
}
