import { XLargeText } from '@microsoft/designer-ui';
import type { AppDispatch } from '../../../core';
import { updateNodeConnection, useOperationInfo, useOperationPanelSelectedNodeId } from '../../../core';
import { useConnectionsForConnector } from '../../../core/queries/connections';
import { useConnectionRefs, useConnectorByNodeId } from '../../../core/state/connection/connectionSelector';
import { useIsCreatingConnection } from '../../../core/state/panel/panelSelectors';
import { setIsCreatingConnection } from '../../../core/state/panel/panelSlice';
import { AllConnections } from './allConnections/allConnections';
import { CreateConnectionWrapper } from './createConnection/createConnectionWrapper';
import { SelectConnection } from './selectConnection/selectConnection';
import { Button } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { useCallback, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { autoCreateConnectionIfPossible, closeConnectionsFlow } from '../../../core/actions/bjsworkflow/connections';
import type { Connection, Connector } from '@microsoft/logic-apps-shared';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const ConnectionPanel = (props: CommonPanelProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const selectedNodeId = useOperationPanelSelectedNodeId();
  const connector = useConnectorByNodeId(selectedNodeId);
  const operationInfo = useOperationInfo(selectedNodeId);
  const references = useConnectionRefs();
  const connectionQuery = useConnectionsForConnector(connector?.id ?? '');
  const connections = useMemo(() => connectionQuery.data ?? [], [connectionQuery.data]);

  const isCreatingConnection = useIsCreatingConnection();

  useEffect(() => {
    if (selectedNodeId && connector && !connectionQuery.isLoading && !connectionQuery.isError && connections.length === 0) {
      autoCreateConnectionIfPossible({
        connector: connector as Connector,
        referenceKeys: Object.keys(references),
        operationInfo,
        applyNewConnection: (connection: Connection) =>
          dispatch(updateNodeConnection({ nodeId: selectedNodeId, connection, connector: connector as Connector })),
        onSuccess: () => dispatch(closeConnectionsFlow({ nodeId: selectedNodeId })),
        onManualConnectionCreation: () => dispatch(setIsCreatingConnection(true)),
      });
    }
  }, [connectionQuery.isError, connectionQuery.isLoading, connections, connector, dispatch, operationInfo, references, selectedNodeId]);

  const panelStatus = useMemo(() => {
    if (!selectedNodeId) {
      return 'default';
    }
    return isCreatingConnection ? 'create' : 'select';
  }, [isCreatingConnection, selectedNodeId]);

  /// INTL
  const intl = useIntl();
  const connectionsPanelDefaultHeader = intl.formatMessage({
    defaultMessage: 'Connections',
    id: 'mlU+AC',
    description: 'Header for the connections panel',
  });
  const selectConnectionPanelHeader = intl.formatMessage({
    defaultMessage: 'Change connection',
    id: 'eb91v1',
    description: 'Header for the change connection panel',
  });
  const createConnectionPanelHeader = intl.formatMessage({
    defaultMessage: 'Create connection',
    id: 'NHqCeQ',
    description: 'Header for the create connection panel',
  });
  const closeButtonAriaLabel = intl.formatMessage({
    defaultMessage: 'Close panel',
    id: 'uzj2d3',
    description: 'Aria label for the close button in the connections panel',
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
        return <CreateConnectionWrapper />;
    }
  }, [panelStatus]);

  return (
    <>
      <div className="msla-app-action-header">
        <XLargeText text={panelHeaderText} />
        <Button aria-label={closeButtonAriaLabel} appearance="subtle" onClick={props.toggleCollapse} icon={<CloseIcon />} />
      </div>
      <div className="msla-connections-panel-body">{renderContent()}</div>
    </>
  );
};
