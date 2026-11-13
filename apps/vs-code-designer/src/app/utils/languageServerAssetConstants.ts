export interface LspAssetsManifest {
  serverArchive: string;
  serverSha256: string;
  sdkPackage: string;
  sdkSha256: string;
}

export const lspServerDirectoryName = 'LSPServer';
export const lspServerRevisionMarkerName = '.lspserver-revision';
export const lspSdkRevisionMarkerName = '.lspsdk-revision';
export const lspAssetsManifestFileName = 'lsp-assets.json';
