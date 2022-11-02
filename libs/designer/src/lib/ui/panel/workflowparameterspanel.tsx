import { useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { addParameter, deleteParameter, updateParameter } from '../../core/state/workflowparameters/workflowparametersSlice';
import {
  useWorkflowParameters,
  useWorkflowParameterValidationErrors,
} from '../../core/state/workflowparameters/workflowparametersselector';
import { Panel, PanelType, useTheme } from '@fluentui/react';
import type { CommonPanelProps, WorkflowParameterUpdateEvent } from '@microsoft/designer-ui';
import { WorkflowParameters } from '@microsoft/designer-ui';
import { useDispatch } from 'react-redux';

export const WorkflowParametersPanel = (props: CommonPanelProps) => {
  const dispatch = useDispatch();
  const readOnly = useReadOnly();
  const { isInverted } = useTheme();
  const workflowParameters = useWorkflowParameters();
  const workflowParametersValidationErrors = useWorkflowParameterValidationErrors();

  const onWorkflowParameterAdd = () => dispatch(addParameter());
  const onDeleteWorkflowParameter = (event: { id: string }) => dispatch(deleteParameter(event.id));
  const onUpdateParameter = (event: WorkflowParameterUpdateEvent) => dispatch(updateParameter(event));

  return (
    <Panel
      isLightDismiss
      type={PanelType.medium}
      isOpen={!props.isCollapsed}
      onDismiss={props.toggleCollapse}
      hasCloseButton={false}
      overlayProps={{ isDarkThemed: isInverted }}
    >
      <WorkflowParameters
        parameters={Object.entries(workflowParameters).map(([key, value]) => ({ id: key, ...value }))}
        isReadOnly={readOnly}
        onDismiss={props.toggleCollapse}
        validationErrors={workflowParametersValidationErrors}
        onAddParameter={onWorkflowParameterAdd}
        onDeleteParameter={onDeleteWorkflowParameter}
        onUpdateParameter={onUpdateParameter}
      />
    </Panel>
  );
};
