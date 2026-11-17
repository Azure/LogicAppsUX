export interface LspAssetsManifest {
  serverArchive: string;
  serverSha256: string;
}

export const lspServerDirectoryName = 'LSPServer';
export const lspServerRevisionMarkerName = '.lspserver-revision';
export const lspAssetsManifestFileName = 'lsp-assets.json';
