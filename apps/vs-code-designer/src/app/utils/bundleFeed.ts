/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { defaultVersionRange, defaultBundleId } from '../../constants';
import { ext } from '../../extensionVariables';
import { getJsonFeed } from './feed';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { IBundleFeed, IBundleMetadata, IHostJsonV2 } from '@microsoft/vscode-extension';
import { TemplateSource } from '@microsoft/vscode-extension';

async function getBundleFeed(context: IActionContext, bundleMetadata: IBundleMetadata | undefined): Promise<IBundleFeed> {
  const bundleId: string = (bundleMetadata && bundleMetadata.id) || defaultBundleId;

  const envVarUri: string | undefined = process.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI;
  // Only use an aka.ms link for the most common case, otherwise we will dynamically construct the url
  let url: string;
  const templateProvider = ext.templateProvider.get(context);
  if (!envVarUri && bundleId === defaultBundleId && templateProvider.templateSource !== TemplateSource.Staging) {
    url = 'https://aka.ms/AA66i2x';
  } else {
    const suffix: string = templateProvider.templateSource === TemplateSource.Staging ? 'staging' : '';
    const baseUrl: string = envVarUri || `https://functionscdn${suffix}.azureedge.net/public`;
    url = `${baseUrl}/ExtensionBundles/${bundleId}/index-v2.json`;
  }

  return getJsonFeed(context, url);
}

export async function getLatestVersionRange(context: IActionContext): Promise<string> {
  const feed: IBundleFeed = await getBundleFeed(context, undefined);
  return feed.defaultVersionRange;
}

export async function addDefaultBundle(context: IActionContext, hostJson: IHostJsonV2): Promise<void> {
  let versionRange: string;
  try {
    versionRange = await getLatestVersionRange(context);
  } catch {
    versionRange = defaultVersionRange;
  }

  // eslint-disable-next-line no-param-reassign
  hostJson.extensionBundle = {
    id: defaultBundleId,
    version: versionRange,
  };
}
