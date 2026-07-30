/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { validateAndInstallBinaries } from '../commands/binaries/validateAndInstallBinaries';
import { autoRuntimeDependenciesValidationAndInstallationSetting } from '../../constants';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { getGlobalSetting } from './vsCodeConfig/settings';
import { isDevContainerWorkspace } from './devContainerUtils';

export const useBinariesDependencies = async (): Promise<boolean> => {
  const isDevContainer = await isDevContainerWorkspace();
  if (isDevContainer) {
    return false;
  }

  const binariesInstallation = getGlobalSetting(autoRuntimeDependenciesValidationAndInstallationSetting);
  return !!binariesInstallation;
};

export async function onboardBinaries(context: IActionContext): Promise<void> {
  const binariesInstallation = await useBinariesDependencies();
  if (binariesInstallation) {
    await validateAndInstallBinaries(context);
  }
}
