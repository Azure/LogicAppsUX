/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../localize';
import { createStorageClient } from './azureClients';
import type { StorageAccount, StorageAccountListKeysResult, StorageManagementClient } from '@azure/arm-storage';
import type { IStorageAccountWizardContext } from '@microsoft/vscode-azext-azureutils';
import { nonNullProp, nonNullValue } from '@microsoft/vscode-azext-utils';

export interface IResourceResult {
  name: string;
  connectionString: string;
}

/**
 * Gets the IDs involed in the azure resource ID.
 * @param {string} id - Azure resource ID.
 * @returns {RegExpMatchArray} Array with IDs.
 */
function parseResourceId(id: string): RegExpMatchArray {
  const matches: RegExpMatchArray | null = id.match(/\/subscriptions\/(.*)\/resourceGroups\/(.*)\/providers\/(.*)\/(.*)/);

  if (matches === null || matches.length < 3) {
    throw new Error(localize('InvalidResourceId', 'Invalid Azure Resource Id'));
  }

  return matches;
}

/**
 * Gets the resource group from storage account id.
 * @param {string} id - Storage account ID.
 * @returns {string} Resource group ID.
 */
export function getResourceGroupFromId(id: string): string {
  return parseResourceId(id)[2];
}

/**
 * Gets storage account resource.
 * @param {IStorageAccountWizardContext} context - Commmand context.
 * @returns {Promise<IResourceResult>} Returns the connection resource.
 */
export async function getStorageConnectionString(context: IStorageAccountWizardContext): Promise<IResourceResult> {
  const client: StorageManagementClient = await createStorageClient(context);
  const storageAccount: StorageAccount = nonNullProp(context, 'storageAccount') as StorageAccount;
  const name: string = nonNullProp(storageAccount, 'name');

  const resourceGroup: string = getResourceGroupFromId(nonNullProp(storageAccount, 'id'));
  const result: StorageAccountListKeysResult = await client.storageAccounts.listKeys(resourceGroup, name);
  const key: string = nonNullProp(nonNullValue(nonNullProp(result, 'keys')[0], 'keys[0]'), 'value');

  let endpointSuffix: string = nonNullProp(context.environment, 'storageEndpointSuffix');

  if (endpointSuffix.startsWith('.')) {
    endpointSuffix = endpointSuffix.substr(1);
  }

  return {
    name,
    connectionString: `DefaultEndpointsProtocol=https;AccountName=${name};AccountKey=${key};EndpointSuffix=${endpointSuffix}`,
  };
}
