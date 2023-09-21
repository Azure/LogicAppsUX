/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../localize';
import { createContainerClient } from '../../../../utils/azureClients';
import type { IManagedEnvironmentContext } from './createManagedEnvironment';
import type { ContainerAppsAPIClient } from '@azure/arm-appcontainers';
import { AzureWizardPromptStep, type ISubscriptionActionContext, nonNullValueAndProp } from '@microsoft/vscode-azext-utils';

export class ManagedEnvironmentNameStep extends AzureWizardPromptStep<IManagedEnvironmentContext> {
  public async prompt(context: IManagedEnvironmentContext): Promise<void> {
    const prompt: string = localize('containerAppNamePrompt', 'Enter a container apps environment name.');
    context.newManagedEnvironmentName = (
      await context.ui.showInputBox({
        prompt,
        validateInput: this.validateInput,
        asyncValidationTask: (name: string) => this.validateNameAvailable(context, name),
      })
    ).trim();

    context.valuesToMask.push(context.newManagedEnvironmentName);
  }

  public shouldPrompt(context: IManagedEnvironmentContext): boolean {
    return !context.managedEnvironment && !context.newManagedEnvironmentName;
  }

  private validateInput(name: string | undefined): string | undefined {
    name = name ? name.trim() : '';

    const { minLength, maxLength } = { minLength: 4, maxLength: 20 };
    if (!/^[a-z]([-a-z0-9]*[a-z0-9])?$/.test(name)) {
      return localize(
        'invalidChar',
        `A name must consist of lower case alphanumeric characters or '-', start with an alphabetic character, and end with an alphanumeric character and cannot have '--'.`
      );
    } else if (name.length < minLength || name.length > maxLength) {
      return localize('invalidLength', 'The name must be between {0} and {1} characters.', minLength, maxLength);
    }

    return undefined;
  }

  private async validateNameAvailable(context: IManagedEnvironmentContext, name: string): Promise<string | undefined> {
    if (!context.resourceGroup) {
      // If a new resource group will house the managed environment, we can skip the name check
      return undefined;
    }

    const resourceGroupName: string = nonNullValueAndProp(context.resourceGroup, 'name');
    if (!(await ManagedEnvironmentNameStep.isNameAvailable(context, resourceGroupName, name))) {
      return localize(
        'managedEnvironmentExists',
        'The container apps environment "{0}" already exists in resource group "{1}".',
        name,
        resourceGroupName
      );
    }

    return undefined;
  }

  public static async isNameAvailable(
    context: ISubscriptionActionContext,
    resourceGroupName: string,
    environmentName: string
  ): Promise<boolean> {
    const client: ContainerAppsAPIClient = await createContainerClient(context);
    try {
      await client.managedEnvironments.get(resourceGroupName, environmentName);
      return false;
    } catch (_e) {
      return true;
    }
  }
}
