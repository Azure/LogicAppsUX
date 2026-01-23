import { equals, getIntl, getPropertyValue, isNullOrEmpty, ResourceService } from '@microsoft/logic-apps-shared';
import { getHostConfig, resetQueriesOnServerAuthUpdate } from './queries';

export const validateMcpServerName = (serverName: string): string | undefined => {
  const intl = getIntl();

  if (isNullOrEmpty(serverName)) {
    return intl.formatMessage({
      defaultMessage: 'Server name is required.',
      id: 'bNReSA',
      description: 'Error message when the server name is empty.',
    });
  }

  if (equals(serverName, 'default')) {
    return intl.formatMessage({
      defaultMessage: `Can't use "default" as the server name.`,
      id: 'tZT3Wl',
      description: 'Error message when the server name is "default".',
    });
  }

  const regex = /^[a-zA-Z0-9]{1,80}$/;
  if (!regex.test(serverName)) {
    if (serverName.length > 80) {
      return intl.formatMessage({
        defaultMessage: 'Server name must be less than 80 characters.',
        id: 'RM72rC',
        description: 'Error message when the server name exceeds maximum length.',
      });
    }

    return intl.formatMessage({
      defaultMessage: 'Enter a unique name under 80 characters with only letters and numbers.',
      id: 'PXn/Tl',
      description: 'Error message when the server name is invalid regex.',
    });
  }

  return undefined;
};

export const validateMcpServerDescription = (description: string): string | undefined => {
  const intl = getIntl();

  if (isNullOrEmpty(description)) {
    return intl.formatMessage({
      defaultMessage: 'Description is required.',
      id: 'UTo47U',
      description: 'Error message when the server description is empty.',
    });
  }

  if (description.length > 1024) {
    return intl.formatMessage({
      defaultMessage: 'Description must be less than 1024 characters.',
      id: 'NE9wXx',
      description: 'Error message when the server description exceeds maximum length.',
    });
  }

  return undefined;
};

export const updateAuthSettings = async (siteResourceId: string, options: string[]) => {
  const authentication = options.length === 1 ? { type: options[0] } : {};
  const hostConfig = await getHostConfig(siteResourceId);
  const updatedConfig = {
    ...(hostConfig.properties ?? {}),
    extensions: {
      ...(hostConfig.properties.extensions ?? {}),
      workflow: {
        ...(hostConfig.properties.extensions?.workflow ?? {}),
        McpServerEndpoints: {
          ...(hostConfig.properties.extensions?.workflow?.McpServerEndpoints ?? {}),
          authentication,
        },
      },
    },
  };

  try {
    await ResourceService().executeResourceAction(
      `${siteResourceId}/deployWorkflowArtifacts`,
      'POST',
      { 'api-version': '2020-06-01' },
      { files: { 'host.json': updatedConfig } }
    );
  } catch (error) {
    const errorMessage = getIntl().formatMessage(
      {
        defaultMessage: 'An error occurred while updating authentication settings. Error details: {error}',
        id: 'Z1p3Yh',
        description: 'General error message for authentication settings update failure',
      },
      { error: (error as any).message }
    );
    throw new Error(errorMessage);
  } finally {
    resetQueriesOnServerAuthUpdate(siteResourceId);
  }
};

export const generateKeys = async (siteResourceId: string, duration: string, accessKey: string) => {
  try {
    const payload = duration === 'noexpiry' ? { keyType: accessKey, neverExpire: true } : { keyType: accessKey, notAfter: duration };
    const response = await ResourceService().executeResourceAction(
      `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/listMcpServerUrl`,
      'POST',
      { 'api-version': '2021-02-01', getApikey: 'true' },
      payload
    );

    return getPropertyValue(response.headers, 'X-API-Key') as string;
  } catch (error) {
    const errorMessage = getIntl().formatMessage(
      {
        defaultMessage: 'An error occurred while generating keys. Error details: {error}',
        id: 'Q2p4Zh',
        description: 'General error message for key generation failure',
      },
      { error: (error as any).message }
    );
    throw new Error(errorMessage);
  }
};

export const addExpiryToCurrent = (hours?: number, days?: number): string => {
  const now = new Date();
  if (hours) {
    return new Date(now.setHours(now.getHours() + hours)).toISOString();
  }
  if (days) {
    return new Date(now.setDate(now.getDate() + days)).toISOString();
  }

  return now.toISOString();
};
