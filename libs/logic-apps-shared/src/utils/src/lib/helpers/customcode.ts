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

/**
 * Gets the extension name based on EditorLanguage.
 * @arg {EditorLanguage} language - The Editor Language to get extension name of.
 * @return {string} - The Extension Name
 */
export const getFileExtensionName = (language: EditorLanguage): string => {
  switch (language) {
    case EditorLanguage.csharp:
      return '.cs';
    case EditorLanguage.powershell:
      return '.ps1';
    default:
      return '.txt';
  }
};

export const getFileExtensionNameFromOperationId = (operationId: string): string => {
  switch (operationId) {
    case 'csharpcode':
      return '.cs';
    case 'powershellcode':
      return '.ps1';
    default:
      return '.txt';
  }
};
