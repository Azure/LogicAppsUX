import { TemplateService } from '@microsoft/logic-apps-shared';
import { useQuery } from '@tanstack/react-query';

export const useExistingWorkflowNames = () => {
  return useQuery(['getExistingWorkflowNames'], async () => {
    return (await TemplateService()?.getExistingWorkflowNames?.()) ?? [];
  });
};
