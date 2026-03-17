import { ResourceService, LoggerService, LogEntryLevel } from '@microsoft/logic-apps-shared';
import { getReactQueryClient } from '../../ReactQueryProvider';

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

    const queryClient = getReactQueryClient();
    queryClient.setQueryData(['knowledgehubs', siteResourceId.toLowerCase()], (oldData: any) => {
      return [...(oldData ?? []), { name: groupName, description, artifacts: [] }];
    });

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
