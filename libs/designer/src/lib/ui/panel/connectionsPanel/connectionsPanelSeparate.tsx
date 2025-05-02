/* eslint-disable @typescript-eslint/no-unused-vars */
import { XLargeText } from '@microsoft/designer-ui';

import { Button } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { useCallback, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import type { Connection, ConnectionReferences, Connector } from '@microsoft/logic-apps-shared';
import { CreateConnectionWrapperSeparate } from './createConnection/createConnectionWrapperSeparate';
import { useConnectionRefs, useConnectorById } from '../../../core/state/connection/connectionSelector';
import type { AppDispatch} from '../../../core';
import { useOperationInfo, useOperationPanelSelectedNodeId } from '../../../core';
import { useConnectionsForConnector } from '../../../core/queries/connections';
import { useIsCreatingConnection } from '../../../core/state/panel/panelSelectors';
import { SelectConnection } from './selectConnection/selectConnection';
import { SelectConnectionSeparate } from './selectConnection/selectConnectionSeparate';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export interface ConnectionPanelSeparateProps extends CommonPanelProps {
  connectorId: string;
  saveConnection: (connectionReferences: ConnectionReferences) => void;
}

export const ConnectionPanelSeparate = (props: ConnectionPanelSeparateProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const selectedNodeId = useOperationPanelSelectedNodeId();
  const connector = useConnectorById(props.connectorId)
  const operationInfo = useOperationInfo(selectedNodeId);
  const references = useConnectionRefs();
  const connectionQuery = useConnectionsForConnector(connector?.id ?? '');
  const connections = useMemo(() => connectionQuery.data ?? [], [connectionQuery.data]);

  const isCreatingConnection = useIsCreatingConnection();

  // useEffect(() => {
  //   if (selectedNodeId && connector && !connectionQuery.isLoading && !connectionQuery.isError && connections.length === 0) {
  //     autoCreateConnectionIfPossible({
  //       connector: connector as Connector,
  //       referenceKeys: Object.keys(references),
  //       operationInfo,
  //       skipOAuth: true,
  //       applyNewConnection: (connection: Connection) =>
  //         dispatch(updateNodeConnection({ nodeId: selectedNodeId, connection, connector: connector as Connector })),
  //       onSuccess: () => dispatch(closeConnectionsFlow({ nodeId: selectedNodeId })),
  //       onManualConnectionCreation: () => dispatch(setIsCreatingConnection(true)),
  //     });
  //   }
  // }, [connectionQuery.isError, connectionQuery.isLoading, connections, connector, dispatch, operationInfo, references, selectedNodeId]);

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
      case 'select':
        return <SelectConnectionSeparate connectorId={props.connectorId} />;
      case 'create':
        return <CreateConnectionWrapperSeparate connectorId={props.connectorId} saveConnection={props.saveConnection}/>;
        case 'default':
            return  <CreateConnectionWrapperSeparate saveConnection={props.saveConnection} connectorId={props.connectorId}/>;
    }
  }, [panelStatus, props.connectorId, props.saveConnection]);

  return (
    <div style={{ width: '100%', height: '100%' }} className="msla-connections-panel">
      <div className="msla-app-action-header">
        <XLargeText text={panelHeaderText} />
        <Button aria-label={closeButtonAriaLabel} appearance="subtle" onClick={props.toggleCollapse} icon={<CloseIcon />} />
      </div>
      <div className="msla-connections-panel-body">{renderContent()}</div>
    </div>
  );
};
