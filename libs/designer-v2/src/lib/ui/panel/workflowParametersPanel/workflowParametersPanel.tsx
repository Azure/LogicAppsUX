import type { AppDispatch } from '../../../core/state/templates/store';
import { deleteWorkflowParameter } from '../../../core/actions/bjsworkflow/delete';
import { useLegacyWorkflowParameters, useReadOnly } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { addParameter, updateParameter } from '../../../core/state/workflowparameters/workflowparametersSlice';
import {
  useWorkflowParameters,
  useWorkflowParameterValidationErrors,
} from '../../../core/state/workflowparameters/workflowparametersselector';
import type { CommonPanelProps, WorkflowParameterUpdateEvent } from '@microsoft/designer-ui';
import { WorkflowParameters } from '@microsoft/designer-ui';
import { useDispatch } from 'react-redux';

export const WorkflowParametersPanel = (props: CommonPanelProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const readOnly = useReadOnly();
  const useLegacy = useLegacyWorkflowParameters();
  const workflowParameters = useWorkflowParameters();
  const workflowParametersValidationErrors = useWorkflowParameterValidationErrors();

  const onWorkflowParameterAdd = () => dispatch(addParameter());
  const onDeleteWorkflowParameter = (event: { id: string }) => dispatch(deleteWorkflowParameter(event.id));
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
    />
  );
};
