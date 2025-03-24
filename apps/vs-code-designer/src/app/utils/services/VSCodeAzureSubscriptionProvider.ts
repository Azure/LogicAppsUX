/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { VSCodeAzureSubscriptionProvider } from '@microsoft/vscode-azext-azureauth';

let vscodeAzureSubscriptionProvider: VSCodeAzureSubscriptionProvider | undefined;

export const createVSCodeAzureSubscriptionProvider = (): VSCodeAzureSubscriptionProvider => {
  vscodeAzureSubscriptionProvider ??= new VSCodeAzureSubscriptionProvider();
  return vscodeAzureSubscriptionProvider;
};
