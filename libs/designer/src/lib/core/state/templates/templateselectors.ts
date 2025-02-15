import { useSelector } from 'react-redux';
import type { RootState } from './store';
import type { WorkflowTemplateData } from '../../actions/bjsworkflow/templates';
import type { ConnectionReference } from '../../../common/models/workflow';

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

export const useConnectionReferenceForKey = (key: string): ConnectionReference => {
  return useSelector((state: RootState) => {
    const connections = state.workflow.connections;
    return connections.references[connections.mapping[key] ?? ''];
  });
};
