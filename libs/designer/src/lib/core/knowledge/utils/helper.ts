import { ResourceService, LoggerService, LogEntryLevel } from '@microsoft/logic-apps-shared';
import { getReactQueryClient } from '../../ReactQueryProvider';

export const createKnowledgeHub = async (siteResourceId: string, groupName: string, description: string) => {
  try {
    const response = await ResourceService().executeResourceAction(
      `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/knowledgeHub/${groupName}`,
      'PUT',
      {
        'api-version': '2025-11-01',
        'Content-Type': 'application/json',
      },
      JSON.stringify({ description })
    );

    const queryClient = getReactQueryClient();
    queryClient.setQueryData(['knowledgehubs', siteResourceId.toLowerCase()], (oldData: any) => {
      return [...oldData, { name: groupName, description, artifacts: [] }];
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
