import { useState, useCallback, useMemo } from 'react';
import { Text, Button } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular, ArrowLeft24Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { useAllConnectors } from '../../../core/queries/browse';
import { useConnectorSelectionStyles } from './connectorSelectionStyles';
import { OperationSearchHeader } from '@microsoft/designer-ui';
import { ConnectorBrowseView } from './ConnectorBrowseView';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

type SelectionState = 'BROWSE' | 'DETAILS';

interface ConnectorSelectionPanelProps {
  onDismiss: () => void;
}

export const ConnectorSelectionPanel = ({ onDismiss }: ConnectorSelectionPanelProps) => {
  const intl = useIntl();
  const styles = useConnectorSelectionStyles();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectionState, setSelectionState] = useState<SelectionState>('BROWSE');
  const [selectedConnectorId, setSelectedConnectorId] = useState<string>('');
  const [filters, setFilters] = useState<Record<string, string>>({
    actionType: 'actions',
  });

  const { data: allConnectors, isLoading: isLoadingConnectors } = useAllConnectors();

  const selectedConnector = useMemo(() => allConnectors?.find((c) => c.id === selectedConnectorId), [allConnectors, selectedConnectorId]);

  const handleConnectorSelect = useCallback((connectorId: string) => {
    setSelectedConnectorId(connectorId);
    setSelectionState('DETAILS');
  }, []);

  const handleBackToBrowse = useCallback(() => {
    setSelectionState('BROWSE');
    setSelectedConnectorId('');
  }, []);

  const INTL_TEXT = {
    title: intl.formatMessage({
      id: 'SH50TJ',
      defaultMessage: 'Add Connectors',
      description: 'Title for connector selection panel',
    }),
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          {selectionState === 'DETAILS' && (
            <Button appearance="subtle" icon={<ArrowLeft24Regular />} onClick={handleBackToBrowse}>
              {INTL_TEXT.backToBrowse}
            </Button>
          )}
          <Text size={600} weight="semibold" style={{ flex: 1 }}>
            {selectionState === 'DETAILS' ? selectedConnector?.properties?.displayName : INTL_TEXT.title}
          </Text>
          <Button appearance="subtle" icon={<CloseIcon />} onClick={onDismiss} aria-label={INTL_TEXT.closeAriaLabel} />
        </div>
      </div>

      {selectionState === 'BROWSE' && (
        <div className={styles.searchSection}>
          <OperationSearchHeader
            searchCallback={setSearchTerm}
            searchTerm={searchTerm}
            filters={filters}
            setFilters={setFilters}
            isTriggerNode={false}
            hideOperations={true}
          />
        </div>
      )}

      <div className={styles.content}>
        {
          selectionState === 'BROWSE' ? (
            <ConnectorBrowseView
              connectors={allConnectors || []}
              isLoading={isLoadingConnectors}
              onConnectorSelect={handleConnectorSelect}
              searchTerm={searchTerm}
              filters={filters}
              setFilters={setFilters}
            />
          ) : null
          // <ConnectorDetailView
          //   connector={selectedConnector}
          //   operations={allOperations}
          //   isLoading={isLoadingOperations}
          //   onOperationSelect={handleOperationSelect}
          // />
        }
      </div>
    </div>
  );
};
