import { Text, Button } from '@fluentui/react-components';
import { Add24Regular, ConnectorFilled } from '@fluentui/react-icons';
import { useMcpWizardStyles } from './styles';
import { useIntl } from 'react-intl';
import { McpPanelView, openPanelView } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../core/state/mcp/store';
import { McpPanelRoot } from '../panel/mcpPanelRoot';

export const McpWizard = () => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const styles = useMcpWizardStyles();
  const connectors = [];

  const handleAddConnectors = () => {
    dispatch(
      openPanelView({
        panelView: McpPanelView.SelectConnector,
        selectedConnectorId: undefined,
      })
    );
  };

  const INTL_TEXT = {
    title: intl.formatMessage({ id: 'rCjtl8', defaultMessage: 'Connectors', description: 'Title for the connectors section' }),
    noConnectors: intl.formatMessage({
      id: 'xyhnsP',
      defaultMessage: 'No connectors added yet',
      description: 'Message displayed when no connectors are available',
    }),
    addFirstConnector: intl.formatMessage({
      id: 'i/0DrA',
      defaultMessage: 'Add your first connector to get started',
      description: 'Message prompting the user to add their first connector',
    }),
    addConnectorsButton: intl.formatMessage({
      id: 'Q54uLy',
      defaultMessage: 'Add Connectors',
      description: 'Button text to add connectors',
    }),
  };

  return (
    <div className={styles.wizardContainer}>
      <div className={styles.header}>
        <Text size={600} weight="semibold">
          {INTL_TEXT.title}
        </Text>
        <Button appearance="primary" icon={<Add24Regular />} onClick={handleAddConnectors}>
          {INTL_TEXT.addConnectorsButton}
        </Button>
      </div>

      <div className={styles.content}>
        {connectors.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>
              <ConnectorFilled />
            </div>
            <Text size={500} weight="semibold" style={{ marginBottom: '8px' }}>
              {INTL_TEXT.noConnectors}
            </Text>
            <Text size={300} style={{ opacity: 0.7, marginBottom: '24px' }}>
              {INTL_TEXT.addFirstConnector}
            </Text>
            <Button appearance="primary" icon={<Add24Regular />} onClick={handleAddConnectors} size="large">
              {INTL_TEXT.addConnectorsButton}
            </Button>
          </div>
        ) : (
          <div className={styles.connectorsList}>{/* Connector items will go here */}</div>
        )}
      </div>
      <McpPanelRoot />
    </div>
  );
};
