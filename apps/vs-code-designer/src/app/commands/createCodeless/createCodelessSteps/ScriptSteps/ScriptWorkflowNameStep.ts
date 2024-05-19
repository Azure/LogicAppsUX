/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../localize';
import { WorkflowNameStepBase } from '../WorkflowNameStepBase';
import { nonNullProp } from '@microsoft/vscode-azext-utils';
import type { IWorkflowTemplate, IScriptWorkflowWizardContext } from '@microsoft/vscode-extension-logic-apps';
import * as fse from 'fs-extra';
import * as path from 'path';

export class ScriptWorkflowNameStep extends WorkflowNameStepBase<IScriptWorkflowWizardContext> {
  protected async getUniqueFunctionName(context: IScriptWorkflowWizardContext): Promise<string | undefined> {
    const template: IWorkflowTemplate = nonNullProp(context, 'functionTemplate');
    return await this.getUniqueFsPath(context.projectPath, template.defaultFunctionName);
  }

  protected async validateFunctionNameCore(context: IScriptWorkflowWizardContext, name: string): Promise<string | undefined> {
    if (await fse.pathExists(path.join(context.projectPath, name))) {
      return localize('existingFolderError', 'A folder with the name "{0}" already exists.', name);
    }
    return undefined;
  }
}
