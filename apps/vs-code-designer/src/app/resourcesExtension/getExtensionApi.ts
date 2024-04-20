/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../localize';
import { apiUtils } from '@microsoft/vscode-azext-utils';
import type { AzureHostExtensionApi } from '@microsoft/vscode-azext-utils/hostapi';

export async function getResourceGroupsApi(): Promise<AzureHostExtensionApi> {
  const rgApiProvider = await apiUtils.getExtensionExports<apiUtils.AzureExtensionApiProvider>('ms-azuretools.vscode-azureresourcegroups');
  if (rgApiProvider) {
    return rgApiProvider.getApi<AzureHostExtensionApi>('0.0.1');
  }
  throw new Error(localize('noResourceGroupExt', 'Could not find the Azure Resource Groups extension'));
}
