import path from 'path';
import { copyFileSync, existsSync as fileExistsSync } from 'fs';
import { localize } from '../../../localize';

export const copyOverImportedSchemas = (
  schemaText: string,
  primarySchemaName: string,
  pathToContainingFolder: string,
  pathToWorkspaceSchemaFolder: string,
  ext
) => {
  const schemaFileDependencies = [...schemaText.matchAll(/schemaLocation="[A-Za-z.]*"/g)].map((schemaFileAttributeMatch) => {
    // Trim down to just the filename
    return schemaFileAttributeMatch[0].split('"')[1];
  });

  schemaFileDependencies.forEach((importedSchemaFileName) => {
    const importedSchemaFileFullPath = path.join(pathToContainingFolder, importedSchemaFileName);

    // Check that the schema file dependency exists in the same directory as the primary schema file
    if (!fileExistsSync(importedSchemaFileFullPath)) {
      ext.showError(
        localize(
          'SchemaLoadingError',
          `Schema loading error: couldn't find schema file import 
                            "{0}" in the same directory as "{1}". "{2}" will still be copied to the Schemas folder.`,
          importedSchemaFileName,
          pathToContainingFolder,
          primarySchemaName
        )
      );
      return;
    }

    // Check that the schema file dependency doesn't already exist in the Schemas folder
    const newSchemaFilePath = path.join(pathToWorkspaceSchemaFolder, importedSchemaFileName);
    if (!fileExistsSync(newSchemaFilePath)) {
      copyFileSync(importedSchemaFileFullPath, newSchemaFilePath);
    }
  });
};
