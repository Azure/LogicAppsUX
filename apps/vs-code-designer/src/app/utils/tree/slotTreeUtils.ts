/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { AppSettingsTreeItem } from '@microsoft/vscode-azext-azureappsettings';
import type { ContainerAppSecret } from '@azure/arm-appservice';
import type { SlotTreeItem } from '../../tree/slotsTree/SlotTreeItem';
import type { LogicAppResourceTree } from '../../tree/LogicAppResourceTree';
import type { ResolvedAppResourceTreeItem } from '@microsoft/vscode-azext-utils/hostapi';

/**
 * Extracts the AppSettingsTreeItem from node.
 */
export function getAppSettingsFromNode(node: SlotTreeItem | ResolvedAppResourceTreeItem<LogicAppResourceTree>): AppSettingsTreeItem {
  const appSettings = (node as SlotTreeItem).resourceTree?.appSettingsTreeItem ?? (node as unknown as LogicAppResourceTree).appSettingsTreeItem;
  if (!appSettings) {
    throw new Error('Could not resolve appSettingsTreeItem from the deploy target node.');
  }
  return appSettings;
}

/**
 * Extracts the hybrid site secrets from node.
 */
export function getHybridSiteSecretsFromNode(node: SlotTreeItem | ResolvedAppResourceTreeItem<LogicAppResourceTree>): ContainerAppSecret[] | undefined {
  return (node as SlotTreeItem).resourceTree?.hybridSiteSecrets ?? (node as unknown as LogicAppResourceTree).hybridSiteSecrets;
}
