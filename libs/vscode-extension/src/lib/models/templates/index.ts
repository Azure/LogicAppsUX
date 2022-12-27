export * from './IBindingTemplate';
export * from './IWorkflowTemplate';

export interface ITemplatesRelease {
  functions: string;
  bindings: string;
  resources: string;
}

export enum TemplatePromptResult {
  skipForNow = 'skipForNow',
}

export enum TemplateSource {
  Backup = 'Backup',
  Latest = 'Latest',
  Staging = 'Staging',
}
