import { useMemo } from 'react';
import { Text, Button } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular, ArrowLeft24Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useAllConnectors } from '../../../core/queries/browse';
import { useConnectorSelectionStyles } from './connectorSelectionStyles';
import type { RootState } from '../../../core/state/mcp/store';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

interface ConnectorDetailPanelProps {
  onDismiss: () => void;
  onBack: () => void;
  onOperationSelect?: (operationId: string) => void;
}

export const OperationSelectionPanel = ({ onDismiss, onBack }: ConnectorDetailPanelProps) => {
  const intl = useIntl();
  const styles = useConnectorSelectionStyles();

  const { selectedConnectorId } = useSelector((state: RootState) => state.mcpPanel);
  const { data: allConnectors } = useAllConnectors();

  const selectedConnector = useMemo(() => allConnectors?.find((c) => c.id === selectedConnectorId), [allConnectors, selectedConnectorId]);

  const INTL_TEXT = {
    backToBrowse: intl.formatMessage({
      id: 'YwhRHw',
      defaultMessage: 'Back to connectors',
      description: 'Button text to return to connector browse view',
    }),
    closeAriaLabel: intl.formatMessage({
      id: 'kdCuJZ',
      defaultMessage: 'Close panel',
      description: 'Aria label for close button',
    }),
  };

  if (!selectedConnector) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <Button appearance="subtle" icon={<ArrowLeft24Regular />} onClick={onBack}>
            {INTL_TEXT.backToBrowse}
          </Button>
          <Text size={600} weight="semibold" style={{ flex: 1 }}>
            {selectedConnector.properties?.displayName}
          </Text>
          <Button appearance="subtle" icon={<CloseIcon />} onClick={onDismiss} aria-label={INTL_TEXT.closeAriaLabel} />
        </div>
      </div>

      <div className={styles.content}>
        <div>Details view for connector: {selectedConnector.properties?.displayName}</div>
        {/* TODO: Implement ConnectorDetailView component */}
        {/* <ConnectorDetailView
          connector={selectedConnector}
          operations={allOperations}
          isLoading={isLoadingOperations}
          onOperationSelect={onOperationSelect}
        /> */}
      </div>
    </div>
  );
};
