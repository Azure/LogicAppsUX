import type { IBindingTemplate } from './IBindingTemplate';
import type { IWorkflowTemplate } from './IWorkflowTemplate';

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

export interface ITemplates {
  workflowTemplates: IWorkflowTemplate[];
  bindingTemplates: IBindingTemplate[];
}
