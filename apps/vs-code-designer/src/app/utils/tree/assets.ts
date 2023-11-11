import { ext } from '../../../extensionVariables';
import { Theme } from '@microsoft/logic-apps-designer';
import type { TreeItemIconPath } from '@microsoft/vscode-azext-utils';
import * as path from 'path';

/**
 * Gets icon path by name.
 * @param {string} iconName - Icon name.
 * @returns {TreeItemIconPath} Icon path.
 */
export function getIconPath(iconName: string): TreeItemIconPath {
  return path.join(getResourcesPath(), `${iconName}.svg`);
}

/**
 * Gets themed structure icon path by name.
 * @param {string} iconName - Icon name.
 * @returns {TreeItemIconPath} Icon path structure.
 */
export function getThemedIconPath(iconName: string): TreeItemIconPath {
  return {
    light: path.join(getResourcesPath(), Theme.Light, `${iconName}.svg`),
    dark: path.join(getResourcesPath(), Theme.Dark, `${iconName}.svg`),
  };
}

/**
 * Gets assets folder path.
 * @returns {string} assets folder path.
 */
function getResourcesPath(): string {
  return ext.context.asAbsolutePath('assets');
}
