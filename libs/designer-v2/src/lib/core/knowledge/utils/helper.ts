import {
  ResourceService,
  LoggerService,
  LogEntryLevel,
  getIntl,
  isNullOrEmpty,
  equals,
  getObjectPropertyValue,
} from '@microsoft/logic-apps-shared';

export const createKnowledgeHub = async (siteResourceId: string, groupName: string, description: string) => {
  try {
    const response = await ResourceService().executeResourceAction(
      `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/knowledgeHubs/${groupName}`,
      'PUT',
      {
        'api-version': '2018-11-01',
        'Content-Type': 'application/json',
      },
      { description }
    );

    return response;
  } catch (errorResponse: any) {
    const errorMessage = getObjectPropertyValue(errorResponse, ['error', 'message']) ?? getObjectPropertyValue(errorResponse, ['message']);
    const error = errorResponse?.error || errorResponse;
    // For now log the error
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'KnowledgeHub.createKnowledgeHub',
      error,
      message: `Error while creating knowledge hub for the app: ${siteResourceId}`,
    });

    throw new Error(errorMessage);
  }
};

export const deleteKnowledgeHubArtifacts = async (siteResourceId: string, hubs: string[], artifacts: Record<string, string>) => {
  const promises: Promise<any>[] = [];

  for (const hubName of hubs) {
    promises.push(
      ResourceService().executeResourceAction(
        `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/knowledgeHubs/${hubName}`,
        'DELETE',
        { 'api-version': '2018-11-01' }
      )
    );
  }

  for (const artifactName of Object.keys(artifacts)) {
    const hubName = artifacts[artifactName];
    promises.push(
      ResourceService().executeResourceAction(
        `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/knowledgeHubs/${hubName}/artifacts/${artifactName}`,
        'DELETE',
        { 'api-version': '2018-11-01' }
      )
    );
  }

  return Promise.all(promises);
};

export const validateHubNameAvailability = (hubName: string, existingNames: string[]): string | undefined => {
  const intl = getIntl();

  if (isNullOrEmpty(hubName)) {
    return intl.formatMessage({
      defaultMessage: 'Requires a unique hub name under 244 characters with only letters and numbers.',
      id: '1KFRSn',
      description: 'Error message when the hub name is empty.',
    });
  }

  if (existingNames.some((name) => equals(name, hubName))) {
    return intl.formatMessage({
      defaultMessage: 'A hub with this name already exists.',
      id: 'M62KKW',
      description: 'Error message when the hub name is not unique.',
    });
  }

  const regex = /^[a-zA-Z0-9]{1,244}$/;
  if (!regex.test(hubName)) {
    if (hubName.length > 244) {
      return intl.formatMessage({
        defaultMessage: `Hub name can't exceed 244 characters.`,
        id: 'EHLy1u',
        description: 'Error message when the hub name exceeds maximum length.',
      });
    }

    return intl.formatMessage({
      defaultMessage: 'Enter a unique name under 244 characters with only letters and numbers.',
      id: 'huLRj0',
      description: 'Error message when the hub name is invalid regex.',
    });
  }

  return undefined;
};

export const validateArtifactNameAvailability = (fileName: string, existingNames: string[]): string | undefined => {
  const intl = getIntl();

  if (isNullOrEmpty(fileName)) {
    return intl.formatMessage({
      defaultMessage: 'Requires a unique file artifact name under 80 characters with only letters and numbers.',
      id: 'trESjR',
      description: 'Error message when the file artifact name is empty.',
    });
  }

  if (existingNames.some((name) => equals(name, fileName))) {
    return intl.formatMessage({
      defaultMessage: 'An artifact with this name already exists in the hub.',
      id: 'rNJguF',
      description: 'Error message when the file artifact name is not unique.',
    });
  }

  const regex = /^[a-zA-Z0-9]{1,80}$/;
  if (!regex.test(fileName)) {
    if (fileName.length > 80) {
      return intl.formatMessage({
        defaultMessage: `File artifact name can't exceed 80 characters.`,
        id: '7Djtki',
        description: 'Error message when the file artifact name exceeds maximum length.',
      });
    }

    return intl.formatMessage({
      defaultMessage: 'Enter a unique name under 80 characters with only letters and numbers.',
      id: 'i1qktD',
      description: 'Error message when the file artifact name is invalid regex.',
    });
  }

  return undefined;
};
