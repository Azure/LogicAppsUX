import { ext } from '../../../extensionVariables';
import { Theme } from '@microsoft/logic-apps-shared';
import type { TreeItemIconPath } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import * as path from 'path';
import { assetsFolderName } from '../../../constants';

/**
 * Gets icon path by name.
 * @param {string} iconName - Icon name.
 * @returns {TreeItemIconPath} Icon path.
 */
export function getIconPath(iconName: string): TreeItemIconPath {
  return vscode.Uri.file(path.join(getResourcesPath(), `${iconName}.svg`));
}

/**
 * Gets themed structure icon path by name.
 * @param {string} iconName - Icon name.
 * @returns {TreeItemIconPath} Icon path structure.
 */
export function getThemedIconPath(iconName: string): TreeItemIconPath {
  return {
    light: vscode.Uri.file(path.join(getResourcesPath(), Theme.Light, `${iconName}.svg`)),
    dark: vscode.Uri.file(path.join(getResourcesPath(), Theme.Dark, `${iconName}.svg`)),
  };
}

/**
 * Gets assets folder path.
 * @returns {string} assets folder path.
 */
function getResourcesPath(): string {
  return ext.context.asAbsolutePath(assetsFolderName);
}
