import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { ConnectorBrowseView } from './ConnectorBrowseView';
import { selectPanelTab } from '../../../core/state/mcp/panel/mcpPanelSlice';
import constants from '../../../common/constants';
import { SearchBox } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { useAllManagedConnectors } from '../../../core/mcp/utils/queries';
import { useConnectorSelectionStyles } from './styles';
import { selectConnectorId } from '../../../core/state/mcp/mcpselectionslice';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';

export const SelectConnectors = () => {
  const intl = useIntl();
  const styles = useConnectorSelectionStyles();
  const dispatch = useDispatch();

  const [searchTerm, setSearchTerm] = useState('');

  const { data: allConnectors, isLoading: isLoadingConnectors } = useAllManagedConnectors();

  const handleConnectorSelect = useCallback(
    (connectorId: string) => {
      dispatch(selectConnectorId(connectorId));
      dispatch(selectPanelTab(constants.MCP_PANEL_TAB_NAMES.OPERATIONS));

      LoggerService().log({
        level: LogEntryLevel.Trace,
        area: 'MCP.SelectConnectors',
        message: 'Connector is selected',
        args: [`connectorId:${connectorId}`],
      });
    },
    [dispatch]
  );

  const INTL_TEXT = {
    searchPlaceholder: intl.formatMessage({
      id: 'w3BZ0u',
      defaultMessage: 'Search...',
      description: 'Placeholder text for connector search input',
    }),
  };

  return (
    <div className={styles.container}>
      <div className={styles.searchSection}>
        <SearchBox
          className={styles.searchBox}
          placeholder={INTL_TEXT.searchPlaceholder}
          value={searchTerm}
          onChange={(_, data) => setSearchTerm(data.value)}
        />
      </div>

      <div className={styles.content}>
        <ConnectorBrowseView
          connectors={allConnectors || []}
          isLoading={isLoadingConnectors}
          onConnectorSelect={handleConnectorSelect}
          searchTerm={searchTerm}
        />
      </div>
    </div>
  );
};
