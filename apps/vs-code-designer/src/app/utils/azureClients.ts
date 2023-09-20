/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { ContainerAppsAPIClient } from '@azure/arm-appcontainers';
import type { WebSiteManagementClient } from '@azure/arm-appservice';
import type { StorageManagementClient } from '@azure/arm-storage';
import { createAzureClient } from '@microsoft/vscode-azext-azureutils';
import type { AzExtClientContext } from '@microsoft/vscode-azext-azureutils';

export async function createStorageClient<T extends AzExtClientContext>(context: T): Promise<StorageManagementClient> {
  return createAzureClient(context, (await import('@azure/arm-storage')).StorageManagementClient);
}

export async function createWebSiteClient(context: AzExtClientContext): Promise<WebSiteManagementClient> {
  return createAzureClient(context, (await import('@azure/arm-appservice')).WebSiteManagementClient);
}

export async function createContainerClient(context: AzExtClientContext): Promise<ContainerAppsAPIClient> {
  return createAzureClient(context, (await import('@azure/arm-appcontainers')).ContainerAppsAPIClient);
}
