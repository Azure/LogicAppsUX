import { useState, useCallback } from 'react';
import { Text, Button } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { useAllConnectors } from '../../../core/queries/browse';
import { useConnectorSelectionStyles } from './connectorSelectionStyles';
import { OperationSearchHeader } from '@microsoft/designer-ui';
import { ConnectorBrowseView } from './ConnectorBrowseView';
import { closePanel, selectPanelTab, selectNodeId } from '../../../core/state/mcp/panel/mcpPanelSlice';
import constants from '../../../common/constants';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

// interface ConnectorSelectionPanelProps {
//   onDismiss: () => void;
// }

export const SelectConnectors = (
  // { onDismiss }: ConnectorSelectionPanelProps
) => {
  const intl = useIntl();
  const styles = useConnectorSelectionStyles();
  const dispatch = useDispatch();

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({
    actionType: 'actions',
  });

  const { data: allConnectors, isLoading: isLoadingConnectors } = useAllConnectors();

  const handleConnectorSelect = useCallback(
    (connectorId: string) => {
      dispatch(selectNodeId(connectorId));
      dispatch(selectPanelTab(constants.MCP_PANEL_TAB_NAMES.OPERATIONS));
    },
    [dispatch]
  );

  const handleDismiss = useCallback(() => {
    dispatch(closePanel());
    // onDismiss();
  }, [dispatch]);

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
          <Text size={600} weight="semibold" style={{ flex: 1 }}>
            {INTL_TEXT.title}
          </Text>
          <Button appearance="subtle" icon={<CloseIcon />} onClick={handleDismiss} aria-label={INTL_TEXT.closeAriaLabel} />
        </div>
      </div>
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

      <div className={styles.content}>
        <ConnectorBrowseView
          connectors={allConnectors || []}
          isLoading={isLoadingConnectors}
          onConnectorSelect={handleConnectorSelect}
          searchTerm={searchTerm}
          filters={filters}
          setFilters={setFilters}
        />
      </div>
    </div>
  );
};
