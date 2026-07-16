/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { InitProjectStepBase } from '../../initProjectForVSCode/initProjectStepBase';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';

export class InitCustomCodeProjectStep extends InitProjectStepBase {
  protected async executeCore(_context: IProjectWizardContext): Promise<void> {
    // No additional setup needed for custom code projects
  }
}
