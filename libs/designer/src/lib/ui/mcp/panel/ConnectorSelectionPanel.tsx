import { useState, useCallback, useMemo } from 'react';
import { Text, Button } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular, ArrowLeft24Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';
import { useAllConnectors } from '../../../core/queries/browse';
import { useConnectorSelectionStyles } from './connectorSelectionStyles';
import { OperationSearchHeader } from '@microsoft/designer-ui';
import { ConnectorBrowseView } from './ConnectorBrowseView';
import type { RootState } from '../../../core/state/mcp/store';
import { openPanelView, McpPanelView, closePanel } from '../../../core/state/mcp/panel/mcpPanelSlice';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

interface ConnectorSelectionPanelProps {
  onDismiss: () => void;
}

export const ConnectorSelectionPanel = ({ onDismiss }: ConnectorSelectionPanelProps) => {
  const intl = useIntl();
  const styles = useConnectorSelectionStyles();
  const dispatch = useDispatch();

  const { currentPanelView, selectedConnectorId } = useSelector((state: RootState) => state.mcpPanel);

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({
    actionType: 'actions',
  });

  const { data: allConnectors, isLoading: isLoadingConnectors } = useAllConnectors();

  const selectedConnector = useMemo(() => allConnectors?.find((c) => c.id === selectedConnectorId), [allConnectors, selectedConnectorId]);

  const handleConnectorSelect = useCallback(
    (connectorId: string) => {
      dispatch(
        openPanelView({
          panelView: McpPanelView.SelectOperation,
          selectedConnectorId: connectorId,
        })
      );
    },
    [dispatch]
  );

  const handleBackToBrowse = useCallback(() => {
    dispatch(
      openPanelView({
        panelView: McpPanelView.SelectConnector,
        selectedConnectorId: undefined,
      })
    );
  }, [dispatch]);

  const handleDismiss = useCallback(() => {
    dispatch(closePanel());
    onDismiss();
  }, [dispatch, onDismiss]);

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

  const isInBrowseView = currentPanelView === McpPanelView.SelectConnector;
  const isInDetailsView = currentPanelView === McpPanelView.SelectOperation;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          {isInDetailsView && (
            <Button appearance="subtle" icon={<ArrowLeft24Regular />} onClick={handleBackToBrowse}>
              {INTL_TEXT.backToBrowse}
            </Button>
          )}
          <Text size={600} weight="semibold" style={{ flex: 1 }}>
            {isInDetailsView ? selectedConnector?.properties?.displayName : INTL_TEXT.title}
          </Text>
          <Button appearance="subtle" icon={<CloseIcon />} onClick={handleDismiss} aria-label={INTL_TEXT.closeAriaLabel} />
        </div>
      </div>

      {isInBrowseView && (
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
        {isInBrowseView ? (
          <ConnectorBrowseView
            connectors={allConnectors || []}
            isLoading={isLoadingConnectors}
            onConnectorSelect={handleConnectorSelect}
            searchTerm={searchTerm}
            filters={filters}
            setFilters={setFilters}
          />
        ) : (
          // Show details view or other views based on currentPanelView
          <div>Details view for connector: {selectedConnector?.properties?.displayName}</div>
          // <ConnectorDetailView
          //   connector={selectedConnector}
          //   operations={allOperations}
          //   isLoading={isLoadingOperations}
          //   onOperationSelect={handleOperationSelect}
          // />
        )}
      </div>
    </div>
  );
};
