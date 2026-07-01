import type { IBindingTemplate } from './IBindingTemplate';
import type { IWorkflowTemplate } from './IWorkflowTemplate';

export * from './IBindingTemplate';
export * from './IWorkflowTemplate';

export interface ITemplatesRelease {
  functions: string;
  bindings: string;
  resources: string;
}

export const TemplatePromptResult = {
  skipForNow: 'skipForNow',
} as const;
export type TemplatePromptResult = (typeof TemplatePromptResult)[keyof typeof TemplatePromptResult];

export interface ITemplates {
  workflowTemplates: IWorkflowTemplate[];
  bindingTemplates: IBindingTemplate[];
}

export const TemplateType = {
  Script: 'Script',
  ScriptBundle: 'ScriptBundle',
  Dotnet: '.NET',
} as const;
export type TemplateType = (typeof TemplateType)[keyof typeof TemplateType];

/**
 * Describes a dotnet template before it has been parsed
 */
export interface IRawTemplate {
  DefaultName: string;
  Name: string;
  Identity: string;
  Parameters: Record<string, any>[];
}

/**
 * Describes a dotnet template setting before it has been parsed
 */
export interface IRawSetting {
  Documentation: string | undefined;
  Name: string;
  DefaultValue: string | undefined;
  DataType: string | undefined;
  Choices:
    | {
        [key: string]: string;
      }
    | undefined;
}
