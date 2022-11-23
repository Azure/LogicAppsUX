import { ext } from '../../../extensionVariables';
import { Theme } from '@microsoft-logic-apps/utils';
import type { TreeItemIconPath } from '@microsoft/vscode-azext-utils';
import * as path from 'path';

export function getIconPath(iconName: string): TreeItemIconPath {
  return path.join(getResourcesPath(), `${iconName}.svg`);
}

export function getThemedIconPath(iconName: string): TreeItemIconPath {
  return {
    light: path.join(getResourcesPath(), Theme.Light, `${iconName}.svg`),
    dark: path.join(getResourcesPath(), Theme.Dark, `${iconName}.svg`),
  };
}

function getResourcesPath(): string {
  return ext.context.asAbsolutePath('assets');
}
