import type { IBindingTemplate } from './IBindingTemplate';
import type { IFunctionTemplate } from './IFunctionTemplate';

export * from './IBindingTemplate';
export * from './IWorkflowTemplate';
export * from './IFunctionTemplate';

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

export interface ITemplates {
  functionTemplates: IFunctionTemplate[];
  bindingTemplates: IBindingTemplate[];
}

export enum TemplateCategory {
  Core = '$temp_category_core',
}

export enum TemplateFilter {
  All = 'All',
  Core = 'Core',
  Verified = 'Verified',
}
