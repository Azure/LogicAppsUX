import { existsSync } from 'fs';
import * as path from 'path';
import { assetsFolderName } from '../../constants';
import { ext } from '../../extensionVariables';

function getFallbackAssetsRoot(): string {
  const candidateRoots = [
    path.resolve(__dirname, '..', '..', assetsFolderName),
    path.resolve(__dirname, '..', '..', '..', assetsFolderName),
  ];

  return candidateRoots.find((candidateRoot) => existsSync(candidateRoot)) ?? candidateRoots[0];
}

export function getExtensionAssetPath(...segments: string[]): string {
  if (ext.context) {
    return ext.context.asAbsolutePath(path.join(assetsFolderName, ...segments));
  }

  return path.join(getFallbackAssetsRoot(), ...segments);
}
