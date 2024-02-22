import { useMonitoringView, useReadOnly } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { WorkflowParametersFooter } from '@microsoft/designer-ui';
import { HostService } from '@microsoft/logic-apps-shared';

export const WorkflowParametersPanelFooter = () => {
  const readOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();

  return (
    <WorkflowParametersFooter onManageParameters={!readOnly && !isMonitoringView ? HostService().openWorkflowParametersBlade : undefined} />
  );
};
