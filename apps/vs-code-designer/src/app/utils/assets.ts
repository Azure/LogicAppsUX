import * as path from 'path';
import { assetsFolderName } from '../../constants';
import { ext } from '../../extensionVariables';

export function getAssetsRoot(): string {
  if (ext.context) {
    return ext.context.asAbsolutePath(assetsFolderName);
  }

  return path.resolve(__dirname, '../..', assetsFolderName);
}

export function getAssetPath(...segments: string[]): string {
  return path.join(getAssetsRoot(), ...segments);
}

export function getWorkspaceTemplatePath(templateFileName: string): string {
  return getAssetPath('WorkspaceTemplates', templateFileName);
}

export function getContainerTemplatePath(templateFileName: string): string {
  return getAssetPath('ContainerTemplates', templateFileName);
}

export function getRuleSetTemplatePath(templateFileName: string): string {
  return getAssetPath('RuleSetProjectTemplate', templateFileName);
}
