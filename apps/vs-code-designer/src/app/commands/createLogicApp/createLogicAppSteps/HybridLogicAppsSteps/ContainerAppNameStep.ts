/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { localize } from '../../../../../localize';
import { createContainerClient } from '../../../../utils/azureClients';
import type { ContainerAppsAPIClient } from '@azure/arm-appcontainers';

const containerNameValidation = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
export class ContainerAppNameStep extends AzureWizardPromptStep<ILogicAppWizardContext> {
  public async prompt(context: ILogicAppWizardContext): Promise<void> {
    const nameAvailabiltyValidationError = await this.validateNameAvailable(context, context.newSiteName);
    const nameValidationError = ContainerAppNameStep.validateInput(context.newSiteName);

    if (!nameAvailabiltyValidationError && !nameValidationError) {
      return;
    }

    const prompt: string = localize(
      'newLogicAppName',
      `Enter a new logic app name, ${nameAvailabiltyValidationError ?? nameValidationError}.`,
      context.newSiteName,
      context.resourceGroup.name
    );

    context.newSiteName = (
      await context.ui.showInputBox({
        prompt,
        validateInput: ContainerAppNameStep.validateInput,
        asyncValidationTask: (name: string) => this.validateNameAvailable(context, name),
      })
    ).trim();
  }

  public shouldPrompt(): boolean {
    return true;
  }

  public static validateInput(name: string | undefined): string | undefined {
    name = name ? name.trim() : '';

    const { minLength, maxLength } = { minLength: 1, maxLength: 32 };
    if (!containerNameValidation.test(name)) {
      return localize(
        'invalidChar',
        `A name must consist of lower case alphanumeric characters or '-', start with an alphabetic character, and end with an alphanumeric character and cannot have '--'.`
      );
    }
    if (name.length < minLength || name.length >= maxLength) {
      return localize('invalidLength', 'The name must be between {0} and {1} characters.', minLength, maxLength);
    }

    return undefined;
  }

  private async validateNameAvailable(context: ILogicAppWizardContext, name: string): Promise<string | undefined> {
    const resourceGroupName: string = context.resourceGroup.name;
    if (!(await ContainerAppNameStep.isNameAvailable(context, resourceGroupName, name))) {
      return localize('containerAppExists', 'The container app "{0}" already exists in resource group "{1}".', name, resourceGroupName);
    }
    return undefined;
  }

  public static async isNameAvailable(
    context: ILogicAppWizardContext,
    resourceGroupName: string,
    containerAppName: string
  ): Promise<boolean> {
    const client: ContainerAppsAPIClient = await createContainerClient(context);
    try {
      await client.containerApps.get(resourceGroupName, containerAppName);
      return false;
    } catch (_e) {
      return true;
    }
  }
}
