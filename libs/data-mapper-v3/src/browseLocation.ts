import * as path from 'path';

export function resolveBrowseDirectory(documentPath: string, rememberedDirectory?: string, preferredFilePath?: string): string {
  if (preferredFilePath) {
    return path.dirname(preferredFilePath);
  }
  if (rememberedDirectory) {
    return rememberedDirectory;
  }
  return path.dirname(documentPath);
}

export const IMPORT_MAP_BROWSE_DIRECTORY_KEY = 'dataMapperV3.lastImportMapDirectory';
export const SCHEMA_BROWSE_DIRECTORY_KEY = 'dataMapperV3.lastSchemaBrowseDirectory';

export function getSelectedFileDirectory(selectedFilePath: string): string {
  return path.dirname(selectedFilePath);
}
