import { ResourceService, LoggerService, LogEntryLevel, type UploadFile } from '@microsoft/logic-apps-shared';
import { getIntl, isNullOrEmpty, equals } from '@microsoft/logic-apps-shared';

export const createKnowledgeHub = async (siteResourceId: string, groupName: string, description: string) => {
  try {
    const response = await ResourceService().executeResourceAction(
      `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/knowledgeHubs/${groupName}`,
      'PUT',
      {
        'api-version': '2018-11-01',
        'Content-Type': 'application/json',
      },
      JSON.stringify({ description })
    );

    return response;
  } catch (errorResponse: any) {
    const error = errorResponse?.error || {};
    // For now log the error
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'KnowledgeHub.createKnowledgeHub',
      error,
      message: `Error while creating knowledge hub for the app: ${siteResourceId}`,
    });
  }
};

export const uploadFileToKnowledgeHub = async (
  siteResourceId: string,
  hubName: string,
  content: { file: UploadFile; name: string; description?: string },
  setIsLoading: (isLoading: boolean) => void,
  armToken?: string
): Promise<void> => {
  const { file, name, description } = content;
  const contentType = file.file.type || 'application/octet-stream';

  const uri = `https://management.azure.com${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/knowledgehubs/${hubName}/knowledgeArtifacts/${name}?api-version=2018-11-01`;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const base64Content = (reader.result as string).split(',')[1]; // Remove data URL prefix

      const payload = {
        description: description,
        payload: {
          '$content-type': contentType,
          $content: base64Content,
        },
      };

      const xhr = new XMLHttpRequest();

      xhr.onloadstart = () => {
        setIsLoading(true);
      };

      xhr.onloadend = () => {
        setIsLoading(false);
        file.setProgress?.(1);

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        setIsLoading(false);
        reject(new Error('Upload failed due to network error'));
      };

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          file.setProgress?.(e.loaded / e.total);
        }
      };

      xhr.open('PUT', uri, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${armToken}`);
      xhr.setRequestHeader('Cache-Control', 'no-cache');

      xhr.send(JSON.stringify(payload));
    };

    reader.onerror = () => {
      setIsLoading(false);
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file.file);
  });
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
      defaultMessage: 'Hub name is required.',
      id: 'cE+Bse',
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

  const regex = /^[a-zA-Z0-9]{1,80}$/;
  if (!regex.test(hubName)) {
    if (hubName.length > 80) {
      return intl.formatMessage({
        defaultMessage: 'Hub name must be less than 80 characters.',
        id: '7HO6IB',
        description: 'Error message when the hub name exceeds maximum length.',
      });
    }

    return intl.formatMessage({
      defaultMessage: 'Enter a unique name under 80 characters with only letters and numbers.',
      id: 'QtEOi0',
      description: 'Error message when the hub name is invalid regex.',
    });
  }

  return undefined;
};

export const validateArtifactNameAvailability = (fileName: string, existingNames: string[]): string | undefined => {
  const intl = getIntl();

  if (isNullOrEmpty(fileName)) {
    return intl.formatMessage({
      defaultMessage: 'File artifact name is required.',
      id: 'mJz0NV',
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
        defaultMessage: 'File artifact name must be less than 80 characters.',
        id: 'yHvXTq',
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
