import { useLegacyWorkflowParameters, useMonitoringView, useReadOnly } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { addParameter, deleteParameter, updateParameter } from '../../../core/state/workflowparameters/workflowparametersSlice';
import {
  useWorkflowParameters,
  useWorkflowParameterValidationErrors,
} from '../../../core/state/workflowparameters/workflowparametersselector';
import { HostService } from '@microsoft/designer-client-services-logic-apps';
import type { CommonPanelProps, WorkflowParameterUpdateEvent } from '@microsoft/designer-ui';
import { WorkflowParameters } from '@microsoft/designer-ui';
import { useDispatch } from 'react-redux';

export const WorkflowParametersPanel = (props: CommonPanelProps) => {
  const dispatch = useDispatch();
  const readOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();
  const useLegacy = useLegacyWorkflowParameters();
  const workflowParameters = useWorkflowParameters();
  const workflowParametersValidationErrors = useWorkflowParameterValidationErrors();

  const onWorkflowParameterAdd = () => dispatch(addParameter());
  const onDeleteWorkflowParameter = (event: { id: string }) => dispatch(deleteParameter(event.id));
  const onUpdateParameter = (event: WorkflowParameterUpdateEvent) => dispatch(updateParameter(event));

  return (
    <WorkflowParameters
      parameters={Object.entries(workflowParameters).map(([key, value]) => ({ id: key, ...value }))}
      isReadOnly={readOnly}
      useLegacy={useLegacy}
      onDismiss={props.toggleCollapse}
      validationErrors={workflowParametersValidationErrors}
      onAddParameter={onWorkflowParameterAdd}
      onDeleteParameter={onDeleteWorkflowParameter}
      onUpdateParameter={onUpdateParameter}
      onManageParameters={!readOnly && !isMonitoringView ? HostService().openWorkflowParametersBlade : undefined}
    />
  );
};
