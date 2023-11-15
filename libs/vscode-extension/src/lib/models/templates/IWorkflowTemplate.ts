/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { IFunctionWizardContext } from '../functions';
import type { IBindingSetting } from './IBindingTemplate';

export const TemplateCategory = {
  Core: '$temp_category_core',
} as const;
export type TemplateCategory = (typeof TemplateCategory)[keyof typeof TemplateCategory];

export interface IWorkflowTemplate {
  id: string;
  name: string;
  defaultFunctionName: string;
  language: string;
  isHttpTrigger: boolean;
  isTimerTrigger: boolean;
  userPromptedSettings: IBindingSetting[];
  categories: TemplateCategory[];
}

export interface IScriptWorkflowWizardContext extends IFunctionWizardContext {
  workflowTemplate?: IWorkflowTemplate;
}
