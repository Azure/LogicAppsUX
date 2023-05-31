import * as vscode from 'vscode';

// Get the extension's information
export const getExtensionVersion = (): string => {
  const extension = vscode.extensions.getExtension('ms-azuretools.vscode-azurelogicapps');

  if (extension) {
    // Access the package.json information
    const { packageJSON } = extension;

    if (packageJSON) {
      // Retrieve the version
      const version = packageJSON.version;

      // Do something with the version
      return version;
    }
  }

  return '';
};
