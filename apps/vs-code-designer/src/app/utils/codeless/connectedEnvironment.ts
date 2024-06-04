import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { sendAzureRequest } from '../requestUtils';
import { HTTP_METHODS } from '@microsoft/logic-apps-shared';

export const updateSMBConnectedEnvironment = async (context: ILogicAppWizardContext): Promise<void> => {
  const { connectedEnvironment, storageAccount, resourceGroup } = context;

  const url = `resourceGroups/${resourceGroup}/providers/Microsoft.App/connectedEnvironments/${connectedEnvironment}/storages/${storageAccount}?api-version=2024-03-01`;

  try {
    const response = await sendAzureRequest(url, context, HTTP_METHODS.PUT);
    const connection = response.parsedBody;
    console.log(connection);
  } catch (error) {
    throw new Error(`Error in getting connection - ${error.message}`);
  }
};
