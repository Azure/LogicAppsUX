import { workflowAppAADClientId, workflowAppAADClientSecret, workflowAppAADObjectId, workflowAppAADTenantId } from '../../../constants';
import type { SlotTreeItem } from '../../tree/slotsTree/SlotTreeItem';
import type { StringDictionary } from '@azure/arm-appservice';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { IIdentityWizardContext } from '@microsoft/vscode-extension-logic-apps';

/**
 * Updates remote logic app settings with identity details.
 * @param {IActionContext} context - Command context.
 * @param {SlotTreeItem} node - Logic app node structure.
 * @param {IIdentityWizardContext} identityWizardContext - Identity context.
 */
export async function updateAppSettingsWithIdentityDetails(
  context: IActionContext,
  node: SlotTreeItem,
  identityWizardContext: IIdentityWizardContext
): Promise<void> {
  const client = await node.site.createClient(context);
  const appSettings: StringDictionary = await client.listApplicationSettings();
  const { clientId, clientSecret, objectId, tenantId } = identityWizardContext;

  if (!!clientId && !!clientSecret && !!objectId && !!tenantId) {
    appSettings.properties = {
      ...appSettings.properties,
      [workflowAppAADClientId]: clientId,
      [workflowAppAADObjectId]: objectId,
      [workflowAppAADTenantId]: tenantId,
      [workflowAppAADClientSecret]: clientSecret,
    };
    await client.updateApplicationSettings(appSettings);
  }
}
