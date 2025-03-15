import { useSelector } from 'react-redux';
import type { RootState } from './store';
import type { WorkflowTemplateData } from '../../actions/bjsworkflow/templates';
import type { ConnectionReference } from '../../../common/models/workflow';
import type { Template } from '@microsoft/logic-apps-shared';

export const useServiceOptions = () => {
  return useSelector((state: RootState) => state.templateOptions);
};

export const useTemplateWorkflows = () => {
  return useSelector((state: RootState) => state.template.workflows ?? {});
};

export const useWorkflowTemplate = (workflowId: string): WorkflowTemplateData => {
  return useSelector((state: RootState) => {
    return state.template.workflows[workflowId];
  });
};

export const useTemplateManifest = (): Template.TemplateManifest | undefined => {
  return useSelector((state: RootState) => {
    return state.template.manifest;
  });
};

export const useWorkflowBasicsEditable = (workflowId: string) => {
  return useSelector((state: RootState) => {
    return {
      isNameEditable: state.templateOptions.viewTemplateDetails?.basicsOverride?.[workflowId]?.name?.isEditable ?? true,
      isKindEditable: state.templateOptions.viewTemplateDetails?.basicsOverride?.[workflowId]?.kind?.isEditable ?? true,
    };
  });
};

export const useConnectionReferenceForKey = (key: string): ConnectionReference => {
  return useSelector((state: RootState) => {
    const connections = state.workflow.connections;
    return connections.references[connections.mapping[key] ?? ''];
  });
};
