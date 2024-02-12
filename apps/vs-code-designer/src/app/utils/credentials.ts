/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { ServiceClientCredentials } from '@azure/ms-rest-js';
import { commands, extensions } from 'vscode';

export const getAccountCredentials = async (tenantId?: string): Promise<any | undefined> => {
  const extension = extensions.getExtension('ms-vscode.azure-account');
  let currentLoggedInSessions: any;

  if (extension) {
    if (!extension.isActive) {
      await extension.activate();
    }
    const azureAccount = extension.exports;
    if (!(await azureAccount.waitForLogin())) {
      await commands.executeCommand('azure-account.askForLogin');
    }

    await azureAccount.waitForFilters();
    currentLoggedInSessions = azureAccount.sessions;
  }

  if (currentLoggedInSessions) {
    return getCredentialsForSessions(currentLoggedInSessions, tenantId);
  }

  return undefined;
};

const getCredentialsForSessions = (sessions: any, tenantId?: string): ServiceClientCredentials => {
  if (tenantId) {
    const tenantDetails = sessions.filter((session) => session.tenantId.toLowerCase() == tenantId);
    return tenantDetails.length ? tenantDetails[0].credentials2 : sessions[0].credentials2;
  } else {
    return sessions[0].credentials2;
  }
};
