import path from 'path';
import * as fse from 'fs-extra';
import { lspAssetsManifestFileName, type LspAssetsManifest } from './languageServerProtocolConstants';

export async function readLspAssetsManifest(assetDirectory: string): Promise<LspAssetsManifest> {
  const manifestPath = path.join(assetDirectory, lspAssetsManifestFileName);
  const manifest = (await fse.readJson(manifestPath)) as Partial<LspAssetsManifest>;
  const hashPattern = /^[a-f0-9]{64}$/;

  if (
    !manifest.serverArchive ||
    path.basename(manifest.serverArchive) !== manifest.serverArchive ||
    !manifest.sdkPackage ||
    path.basename(manifest.sdkPackage) !== manifest.sdkPackage ||
    !manifest.serverSha256 ||
    !hashPattern.test(manifest.serverSha256) ||
    !manifest.sdkSha256 ||
    !hashPattern.test(manifest.sdkSha256)
  ) {
    throw new Error(`Logic Apps language server asset manifest '${manifestPath}' is invalid.`);
  }

  return manifest as LspAssetsManifest;
}
