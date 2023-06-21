import { useLegacyWorkflowParameters, useMonitoringView, useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { addParameter, deleteParameter, updateParameter } from '../../core/state/workflowparameters/workflowparametersSlice';
import {
  useWorkflowParameters,
  useWorkflowParameterValidationErrors,
} from '../../core/state/workflowparameters/workflowparametersselector';
import { Panel, PanelType, useTheme } from '@fluentui/react';
import { HostService } from '@microsoft/designer-client-services-logic-apps';
import type { CommonPanelProps, WorkflowParameterUpdateEvent } from '@microsoft/designer-ui';
import { PanelLocation, WorkflowParameters } from '@microsoft/designer-ui';
import { useDispatch } from 'react-redux';

export const WorkflowParametersPanel = (props: CommonPanelProps) => {
  const dispatch = useDispatch();
  const readOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();
  const useLegacy = useLegacyWorkflowParameters();
  const { isInverted } = useTheme();
  const workflowParameters = useWorkflowParameters();
  const workflowParametersValidationErrors = useWorkflowParameterValidationErrors();

  const onWorkflowParameterAdd = () => dispatch(addParameter());
  const onDeleteWorkflowParameter = (event: { id: string }) => dispatch(deleteParameter(event.id));
  const onUpdateParameter = (event: WorkflowParameterUpdateEvent) => dispatch(updateParameter(event));

  return (
    <Panel
      isLightDismiss
      type={props.panelLocation === PanelLocation.Right ? PanelType.medium : PanelType.customNear}
      isOpen={!props.isCollapsed}
      onDismiss={props.toggleCollapse}
      hasCloseButton={false}
      overlayProps={{ isDarkThemed: isInverted }}
      focusTrapZoneProps={{ disabled: props.isCollapsed, forceFocusInsideTrap: true }}
      layerProps={props.layerProps}
      customWidth={props.width}
    >
      <WorkflowParameters
        parameters={Object.entries(workflowParameters).map(([key, value]) => ({ id: key, ...value }))}
        isReadOnly={readOnly}
        useLegacy={useLegacy}
        onDismiss={props.toggleCollapse}
        validationErrors={workflowParametersValidationErrors}
        onAddParameter={onWorkflowParameterAdd}
        onDeleteParameter={onDeleteWorkflowParameter}
        onUpdateParameter={onUpdateParameter}
        onManageParameters={useLegacy && !readOnly && !isMonitoringView ? HostService().openWorkflowParametersBlade : undefined}
      />
    </Panel>
  );
};
