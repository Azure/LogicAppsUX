import { TreeItemIconPath } from "@microsoft/vscode-azext-utils";
import { ext } from "../../../extensionVariables";
import * as path from 'path';

export function getIconPath(iconName: string): TreeItemIconPath {
    return path.join(getResourcesPath(), `${iconName}.svg`);
}

export function getThemedIconPath(iconName: string): TreeItemIconPath {
    return {
        light: path.join(getResourcesPath(), 'light', `${iconName}.svg`),
        dark: path.join(getResourcesPath(), 'dark', `${iconName}.svg`)
    };
}

function getResourcesPath(): string {
    return ext.context.asAbsolutePath('resources');
}