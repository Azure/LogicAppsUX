/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { TemplateCategory } from '..';
import type { IFunctionWizardContext } from '../functions';
import type { IBindingSetting } from './IBindingTemplate';

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
