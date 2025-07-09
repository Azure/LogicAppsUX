import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useAllConnectors } from '../../../core/queries/browse';
import { useConnectorSelectionStyles } from './connectorSelectionStyles';
import { OperationSearchHeader } from '@microsoft/designer-ui';
import { ConnectorBrowseView } from './ConnectorBrowseView';
import { selectPanelTab, selectNodeId } from '../../../core/state/mcp/panel/mcpPanelSlice';
import constants from '../../../common/constants';

export const SelectConnectors = () => {
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

  return (
    <div className={styles.container}>
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
