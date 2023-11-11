import { useMonitoringView, useReadOnly } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { HostService } from '@microsoft/logic-apps-designer';
import { WorkflowParametersFooter } from '@microsoft/logic-apps-designer';

export const WorkflowParametersPanelFooter = () => {
  const readOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();

  return (
    <WorkflowParametersFooter onManageParameters={!readOnly && !isMonitoringView ? HostService().openWorkflowParametersBlade : undefined} />
  );
};
