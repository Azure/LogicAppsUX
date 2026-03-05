import { Card, CardHeader, CardPreview, Image, Text } from '@fluentui/react-components';
import WorkflowIcon from '../../../common/images/templates/logicapps.svg';
import { useIntl } from 'react-intl';
import { useMcpEligibleWorkflows } from '../../../core/mcp/utils/queries';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/mcp/store';
import { useCallback, useMemo, useState } from 'react';
import { EmptyWorkflowsModal } from './modals';
import { McpPanelView, openMcpPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { Add28Filled } from '@fluentui/react-icons';
import { useMcpServerAddStyles } from './styles';

export const AddServerButtons = ({ onCreateTools, onUseExisting }: { onCreateTools: () => void; onUseExisting?: () => void }) => {
  const intl = useIntl();
  const INTL_TEXT = {
    useExistingTitle: intl.formatMessage({
      defaultMessage: 'Use existing workflows',
      id: 'gOKtki',
      description: 'Button text for using existing workflows as tools',
    }),
    useExistingDescription: intl.formatMessage({
      defaultMessage: 'Set up your MCP server with existing workflows. Select them from this logic app.',
      id: 'C3taj3',
      description: 'Description for using existing workflows as tools',
    }),
    createNewTitle: intl.formatMessage({
      defaultMessage: 'Create new workflows',
      id: 'lLhS3T',
      description: 'Button text for creating new workflows',
    }),
    createNewDescription: intl.formatMessage({
      defaultMessage: 'Set up your MCP server with new workflows. Build them with connectors and actions from our catalog.',
      id: '6+7YiX',
      description: 'Description for creating new workflows',
    }),
  };

  const styles = useMcpServerAddStyles();
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

    onUseExisting?.();
  }, [dispatch, hasEligibleWorkflows, onUseExisting]);

  const [existingSelected, setExistingSelected] = useState(false);
  const [newSelected, setNewSelected] = useState(false);

  return (
    <div className={styles.container}>
      <Card
        className={styles.firstCard}
        disabled={isLoading}
        selected={existingSelected}
        onSelectionChange={(_, { selected }) => {
          setExistingSelected(selected);
          if (selected) {
            handleUseExistingWorkflows();
          }
        }}
        onClick={handleUseExistingWorkflows}
      >
        <CardHeader
          className={styles.cardHeader}
          image={<Image src={WorkflowIcon} className={styles.cardIcon} />}
          header={INTL_TEXT.useExistingTitle}
        />
        <CardPreview className={styles.cardContent}>
          <Text>{INTL_TEXT.useExistingDescription}</Text>
        </CardPreview>
      </Card>
      <Card
        selected={newSelected}
        onSelectionChange={(_, { selected }) => {
          setNewSelected(selected);
          if (selected) {
            onCreateTools();
          }
        }}
        onClick={onCreateTools}
      >
        <CardHeader
          className={styles.cardHeader}
          image={<Add28Filled className={styles.secondCardIcon} />}
          header={INTL_TEXT.createNewTitle}
        />
        <CardPreview className={styles.cardContent}>
          <Text>{INTL_TEXT.createNewDescription}</Text>
        </CardPreview>
      </Card>

      {showEmptyWorkflowsModal ? <EmptyWorkflowsModal onDismiss={() => setShowEmptyWorkflowsModal(false)} /> : null}
    </div>
  );
};
