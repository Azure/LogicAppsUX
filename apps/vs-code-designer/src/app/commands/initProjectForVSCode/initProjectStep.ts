/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { InitProjectStepBase } from './initProjectStepBase';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';

export class InitProjectStep extends InitProjectStepBase {
  protected async executeCore(_context: IProjectWizardContext): Promise<void> {
    // Deploy subpath is handled by the settings generator
  }
}
