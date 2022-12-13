export * from './IBindingTemplate';
export * from './IFunctionTemplate';

export interface ITemplatesRelease {
  functions: string;
  bindings: string;
  resources: string;
}

export enum TemplateFilter {
  All = 'All',
  Core = 'Core',
  Verified = 'Verified',
}

export enum TemplatePromptResult {
  changeFilter = 'changeFilter',
  skipForNow = 'skipForNow',
}

export enum TemplateSource {
  Backup = 'Backup',
  Latest = 'Latest',
  Staging = 'Staging',
}
