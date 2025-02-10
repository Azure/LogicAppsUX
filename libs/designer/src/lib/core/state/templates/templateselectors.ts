import { useSelector } from 'react-redux';
import type { RootState } from './store';
import type { WorkflowTemplateData } from '../../actions/bjsworkflow/templates';

export const useAreServicesInitialized = () => {
  return useSelector((state: RootState) => state.template.servicesInitialized ?? false);
};

export const useTemplateWorkflows = () => {
  return useSelector((state: RootState) => state.template.workflows ?? {});
};

export const useWorkflowTemplate = (workflowId: string): WorkflowTemplateData => {
  return useSelector((state: RootState) => {
    return state.template.workflows[workflowId];
  });
};

export const useDefaultWorkflowTemplate = (): WorkflowTemplateData => {
  return useSelector((state: RootState) => {
    const workflows = state.template.workflows ?? {};
    return Object.values(workflows)[0];
  });
};
