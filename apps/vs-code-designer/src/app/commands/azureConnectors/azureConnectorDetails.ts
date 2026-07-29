/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  workflowTenantIdKey,
  workflowSubscriptionIdKey,
  workflowResourceGroupNameKey,
  workflowLocationKey,
  workflowManagementBaseURIKey,
  azurePublicBaseUrl,
} from '../../../constants';
import { createAzureWizard, type IAzureConnectorsContext } from './azureConnectorWizard';
import { isConnectorSetupSkipped, setConnectorSetupSkipped } from '../../state/connectors';
import { getLocalSettingsJson } from '../../utils/appSettings/localSettings';
import { getAuthData } from '../../utils/codeless/getAuthorizationToken';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { parseError } from '@microsoft/vscode-azext-utils';
import type { AzureConnectorDetails } from '@microsoft/vscode-extension-logic-apps';

// --- Azure connector details cache and orchestration ---

const azureDetailsCache = new Map<string, { timestamp: number; details: AzureConnectorDetails }>();
const AZURE_DETAILS_CACHE_TTL = 300000; // 5 minutes

export async function getAzureConnectorDetailsForLocalProject(
  context: IActionContext,
  projectPath: string
): Promise<AzureConnectorDetails> {
  if (!projectPath) {
    context.telemetry.properties.azureConnectorDetailsProjectPathMissing = 'true';
    return {
      enabled: false,
    };
  }

  // Check cache first
  const cached = azureDetailsCache.get(projectPath);
  const now = Date.now();
  if (cached && now - cached.timestamp < AZURE_DETAILS_CACHE_TTL) {
    return cached.details;
  }

  const connectorsContext = context as IAzureConnectorsContext;
  const localSettings = await getLocalSettingsJson(context, projectPath);
  let tenantId = localSettings.Values![workflowTenantIdKey];
  let subscriptionId = localSettings.Values![workflowSubscriptionIdKey];
  let resourceGroupName = localSettings.Values![workflowResourceGroupNameKey];
  let location = localSettings.Values![workflowLocationKey];
  let accessToken = undefined;
  let clientId = undefined;
  // Set default for customers who created Logic Apps before sovereign cloud support was added.
  let workflowManagementBaseUrl = localSettings.Values![workflowManagementBaseURIKey] ?? `${azurePublicBaseUrl}/`;

  if (!subscriptionId) {
    if (isConnectorSetupSkipped(projectPath)) {
      const skippedDetails: AzureConnectorDetails = { enabled: false };
      azureDetailsCache.set(projectPath, { timestamp: now, details: skippedDetails });
      return skippedDetails;
    }

    const wizard = createAzureWizard(connectorsContext, projectPath);
    try {
      await wizard.prompt();
      await wizard.execute();
    } catch (error) {
      if (!parseError(error).isUserCancelledError) {
        throw error;
      }

      context.telemetry.properties.useDefaultAzureConnectorDetails = 'true';
      await setConnectorSetupSkipped(projectPath);
      const defaultDetails = { enabled: false };
      azureDetailsCache.set(projectPath, { timestamp: now, details: defaultDetails });
      return defaultDetails;
    }

    tenantId = connectorsContext.tenantId;
    subscriptionId = connectorsContext.subscriptionId;
    resourceGroupName = connectorsContext.resourceGroup?.name || '';
    location = connectorsContext.resourceGroup?.location || '';
    workflowManagementBaseUrl = connectorsContext.environment?.resourceManagerEndpointUrl;
  }

  // Get auth token if we have a valid subscription (whether from wizard or local.settings.json)
  if (subscriptionId) {
    const authData = await getAuthData(tenantId);
    accessToken = `Bearer ${authData?.accessToken}`;
    if (authData?.account?.id) {
      const [parsedClientId, parsedTenantId] = authData.account.id.split('.');
      tenantId = parsedTenantId;
      clientId = parsedClientId;
    }
  }

  // Compute enabled AFTER the wizard block — subscriptionId may now have a value
  const enabled = !!subscriptionId;

  const details: AzureConnectorDetails = {
    enabled,
    accessToken: accessToken,
    subscriptionId: enabled ? subscriptionId : undefined,
    resourceGroupName: enabled ? resourceGroupName : undefined,
    location: enabled ? location : undefined,
    tenantId: enabled ? tenantId : undefined,
    clientId: enabled ? clientId : undefined,
    workflowManagementBaseUrl: enabled ? workflowManagementBaseUrl : undefined,
  };

  // Cache the result
  azureDetailsCache.set(projectPath, { timestamp: now, details });

  return details;
}

export function invalidateAzureDetailsCache(projectPath: string): void {
  azureDetailsCache.delete(projectPath);
}
