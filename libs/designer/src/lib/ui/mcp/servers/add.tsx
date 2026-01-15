import { Card, CardHeader, CardPreview, Text } from '@fluentui/react-components';
import WorkflowIcon from '../../common/images/templates/logicapps.svg';
import { useIntl } from 'react-intl';
import { useMcpEligibleWorkflows } from '../../../core/mcp/utils/queries';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/mcp/store';
import { useCallback, useMemo, useState } from 'react';
import { EmptyWorkflowsModal } from './modals';
import { McpPanelView, openMcpPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';

export const AddServerButtons = ({ onCreateTools }: { onCreateTools: () => void }) => {
  const intl = useIntl();
  const INTL_TEXT = {
    useExistingTitle: intl.formatMessage({
      defaultMessage: 'Use existing workflow tools',
      id: 'eXmI5S',
      description: 'Button text for using existing server',
    }),
    useExistingDescription: intl.formatMessage({
      defaultMessage: 'Select from workflows already existing in this logic app.',
      id: 'dPqgon',
      description: 'Description for using existing server',
    }),
    createNewTitle: intl.formatMessage({
      defaultMessage: 'Create new workflow tools',
      id: 'ugN7mQ',
      description: 'Button text for creating new server',
    }),
    createNewDescription: intl.formatMessage({
      defaultMessage: 'Create tools that run connector actions so your server can perform tasks.',
      id: 'o9xzn9',
      description: 'Description for creating new server',
    }),
  };

  const dispatch = useDispatch<AppDispatch>();
  const [showEmptyWorkflowsModal, setShowEmptyWorkflowsModal] = useState<boolean>(false);
  const { subscriptionId, resourceGroup, logicAppName } = useSelector((state: RootState) => ({
    subscriptionId: state.resource.subscriptionId,
    resourceGroup: state.resource.resourceGroup,
    logicAppName: state.resource.logicAppName,
  }));
  const { data: eligibleWorkflows, isLoading } = useMcpEligibleWorkflows(subscriptionId, resourceGroup, logicAppName as string);
  const hasEligibleWorkflows = useMemo(() => (eligibleWorkflows?.length ?? 0) > 0, [eligibleWorkflows]);
  const handleUseExistingWorkflows = useCallback(() => {
    if (hasEligibleWorkflows) {
      dispatch(openMcpPanelView({ panelView: McpPanelView.CreateMcpServer }));
    } else {
      setShowEmptyWorkflowsModal(true);
    }
  }, [dispatch, hasEligibleWorkflows]);

  return (
    <div>
      <Card disabled={isLoading}>
        <CardHeader image={<img src={WorkflowIcon} />} header={INTL_TEXT.useExistingTitle} onClick={handleUseExistingWorkflows} />
        <CardPreview>
          <Text>{INTL_TEXT.useExistingDescription}</Text>
        </CardPreview>
      </Card>
      <Card>
        <CardHeader image={<img src={WorkflowIcon} />} header={INTL_TEXT.createNewTitle} onClick={onCreateTools} />
        <CardPreview>
          <Text>{INTL_TEXT.createNewDescription}</Text>
        </CardPreview>
      </Card>

      {showEmptyWorkflowsModal ? <EmptyWorkflowsModal onDismiss={() => setShowEmptyWorkflowsModal(false)} /> : null}
    </div>
  );
};
