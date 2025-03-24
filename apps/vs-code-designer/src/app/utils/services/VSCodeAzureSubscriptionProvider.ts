/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { VSCodeAzureSubscriptionProvider } from '@microsoft/vscode-azext-azureauth';

let vscodeAzureSubscriptionProvider: VSCodeAzureSubscriptionProvider | undefined;

export const createVSCodeAzureSubscriptionProviderFactory = (): VSCodeAzureSubscriptionProvider => {
  vscodeAzureSubscriptionProvider ??= new VSCodeAzureSubscriptionProvider();
  return vscodeAzureSubscriptionProvider;
};

// const createVSCodeAzureSubscriptionProvider = (): VSCodeAzureSubscriptionProvider =>{
//     // This will update the selected subscription IDs to ensure the filters are in the form of `${tenantId}/${subscriptionId}`
//     // await getSelectedTenantAndSubscriptionIds();

//     return ;
// }
