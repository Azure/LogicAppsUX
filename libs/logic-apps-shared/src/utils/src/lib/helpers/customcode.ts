export const EditorLanguage = {
  javascript: 'javascript',
  json: 'json',
  xml: 'xml',
  templateExpressionLanguage: 'TemplateExpressionLanguage',
  yaml: 'yaml',
  csharp: 'csharp',
  powershell: 'powershell',
} as const;
export type EditorLanguage = (typeof EditorLanguage)[keyof typeof EditorLanguage];

export interface VFSObject {
  name: string;
  size: number;
  mtime: string;
  crtime: string;
  mime: string;
  href: string;
  path: string;
}

/**
 * Gets the extension name based on EditorLanguage.
 * @arg {EditorLanguage} language - The Editor Language to get extension name of.
 * @return {string} - The Extension Name
 */
export const getFileExtensionName = (language: EditorLanguage): string => {
  switch (language) {
    case EditorLanguage.csharp:
      return '.csx';
    case EditorLanguage.powershell:
      return '.ps1';
    default:
      return '.txt';
  }
};

export const getFileExtensionNameFromOperationId = (operationId: string): string => {
  switch (operationId) {
    case 'csharpscriptcode':
      return '.csx';
    case 'powershellcode':
      return '.ps1';
    default:
      return '.txt';
  }
};

export const mapFileExtensionToAppFileName = (fileExtension: string) => {
  switch (fileExtension) {
    case '.ps1':
      return 'requirements.psd1';
    default:
      return '';
  }
};

export const getAppFiles = (files: VFSObject[]): Record<string, boolean> => {
  const appFiles: Record<string, boolean> = {};
  appFiles['.ps1'] = !!files.find((file) => file.name === 'requirements.psd1');
  return appFiles;
};

export const getAppFileForFileExtension = (fileExtension: string): string => {
  if (fileExtension === '.ps1') {
    return "# This file enables modules to be automatically managed by the Functions service.\r\n# See https://aka.ms/functionsmanageddependency for additional information.\r\n#\r\n@{\r\n    # For latest supported version, go to 'https://www.powershellgallery.com/packages/Az'. Uncomment the next line and replace the MAJOR_VERSION, e.g., 'Az' = '5.*'\r\n     'Az' = '10.*'\r\n}";
  }
  return '';
};
