import { useSelectedNodeId } from '../../../core';
import { useConnectionsForConnector } from '../../../core/queries/connections';
import { useConnectorByNodeId } from '../../../core/state/connection/connectionSelector';
import { useIsCreatingConnection } from '../../../core/state/panel/panelSelectors';
import { setIsCreatingConnection } from '../../../core/state/panel/panelSlice';
import { AllConnections } from './allConnections/allConnections';
import { CreateConnection } from './createConnection';
import { SelectConnection } from './selectConnection/selectConnection';
import { FocusTrapZone, IconButton, Text } from '@fluentui/react';
import { type CommonPanelProps } from '@microsoft/designer-ui';
import { useCallback, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

export const ConnectionPanel = (props: CommonPanelProps) => {
  const dispatch = useDispatch();
  const selectedNodeId = useSelectedNodeId();
  const connector = useConnectorByNodeId(selectedNodeId);
  const connectionQuery = useConnectionsForConnector(connector?.id ?? '');
  const connections = useMemo(() => connectionQuery.data ?? [], [connectionQuery]);

  const isCreatingConnection = useIsCreatingConnection();

  useEffect(() => {
    if (selectedNodeId && !connectionQuery.isLoading && !connectionQuery.isError && connections.length === 0)
      dispatch(setIsCreatingConnection(true));
  }, [connectionQuery.isError, connectionQuery.isLoading, connections, dispatch, selectedNodeId]);

  const panelStatus = useMemo(() => {
    if (!selectedNodeId) return 'default';
    return isCreatingConnection ? 'create' : 'select';
  }, [isCreatingConnection, selectedNodeId]);

  /// INTL
  const intl = useIntl();
  const connectionsPanelDefaultHeader = intl.formatMessage({
    defaultMessage: 'Connections',
    description: 'Header for the connections panel',
  });
  const selectConnectionPanelHeader = intl.formatMessage({
    defaultMessage: 'Change Connection',
    description: 'Header for the change connection panel',
  });
  const createConnectionPanelHeader = intl.formatMessage({
    defaultMessage: 'Create Connection',
    description: 'Header for the create connection panel',
  });

  const panelHeaderText = useMemo(() => {
    switch (panelStatus) {
      case 'default':
        return connectionsPanelDefaultHeader;
      case 'select':
        return selectConnectionPanelHeader;
      case 'create':
        return createConnectionPanelHeader;
    }
  }, [connectionsPanelDefaultHeader, createConnectionPanelHeader, panelStatus, selectConnectionPanelHeader]);

  const renderContent = useCallback(() => {
    switch (panelStatus) {
      case 'default':
        return <AllConnections />;
      case 'select':
        return <SelectConnection />;
      case 'create':
        return <CreateConnection />;
    }
  }, [panelStatus]);

  return (
    <FocusTrapZone>
      <div className="msla-app-action-header">
        <Text variant="xLarge">{panelHeaderText}</Text>
        <IconButton onClick={props.toggleCollapse} iconProps={{ iconName: 'Cancel' }} />
      </div>
      <div className="msla-connections-panel-body">{renderContent()}</div>
    </FocusTrapZone>
  );
};
