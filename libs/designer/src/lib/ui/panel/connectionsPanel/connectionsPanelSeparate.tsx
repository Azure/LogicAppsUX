/* eslint-disable @typescript-eslint/no-unused-vars */
import { XLargeText } from '@microsoft/designer-ui';

import type { CommonPanelProps } from '@microsoft/designer-ui';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import type { ConnectionReferences } from '@microsoft/logic-apps-shared';
import { CreateConnectionWrapperSeparate } from './createConnection/createConnectionWrapperSeparate';
import { useConnectionRefs, useConnectorById } from '../../../core/state/connection/connectionSelector';
import type { AppDispatch } from '../../../core';
import { useOperationInfo, useOperationPanelSelectedNodeId } from '../../../core';
import { useConnectionsForConnector } from '../../../core/queries/connections';
import { useIsCreatingConnection } from '../../../core/state/panel/panelSelectors';
import { SelectConnectionSeparate } from './selectConnection/selectConnectionSeparate';
import { useIsXrmConnectionReferenceMode } from '../../../core/state/designerOptions/designerOptionsSelectors';

export interface ConnectionPanelSeparateProps extends CommonPanelProps {
  connectorId: string;
  saveConnection: (connectionReferences: ConnectionReferences) => void;
}

export const ConnectionPanelSeparate = (props: ConnectionPanelSeparateProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const selectedNodeId = useOperationPanelSelectedNodeId();
  const connector = useConnectorById(props.connectorId);
  const operationInfo = useOperationInfo(selectedNodeId);
  const references = useConnectionRefs();
  const connectionQuery = useConnectionsForConnector(connector?.id ?? '');
  const connections = useMemo(() => connectionQuery.data ?? [], [connectionQuery.data]);
  const [isCreated, setIsCreated] = useState(false);
  const isXrmConnectionReferenceMode = useIsXrmConnectionReferenceMode();

  const isCreatingConnection = useIsCreatingConnection();

  const panelStatus = useMemo(() => {
    if (isCreated) {
      return 'done';
    }
    if (!selectedNodeId) {
      return 'default';
    }
    return isCreatingConnection ? 'create' : 'select';
  }, [isCreatingConnection, selectedNodeId, isCreated]);

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
      case 'done':
        return undefined;
      case 'default':
        return connectionsPanelDefaultHeader;
      case 'select':
        return selectConnectionPanelHeader;
      case 'create':
        return createConnectionPanelHeader;
    }
  }, [connectionsPanelDefaultHeader, createConnectionPanelHeader, panelStatus, selectConnectionPanelHeader]);

  const onConnectionSave = useCallback(
    (connectionReferences: ConnectionReferences) => {
      props.saveConnection(connectionReferences);
      setIsCreated(true);
    },
    [props]
  );

  const renderContent = useCallback(() => {
    switch (panelStatus) {
      case 'done':
        return <div>Connection Created</div>;
      case 'select':
        return <SelectConnectionSeparate connectorId={props.connectorId} />;
      case 'create':
        return <CreateConnectionWrapperSeparate connectorId={props.connectorId} saveConnection={onConnectionSave} />;
      case 'default':
        return <CreateConnectionWrapperSeparate saveConnection={props.saveConnection} connectorId={props.connectorId} />;
    }
  }, [panelStatus, props.connectorId, onConnectionSave, props.saveConnection]);

  return (
    <div style={{ padding: '20px', width: '50%', minWidth: '500px', height: '100%' }} className="msla-connections-panel">
      <div className="msla-app-action-header">
        <XLargeText text={panelHeaderText} />
        {/* <Button aria-label={closeButtonAriaLabel} appearance="subtle" onClick={props.toggleCollapse} icon={<CloseIcon />} /> */}
      </div>
      <div className="msla-connections-panel-body">{renderContent()}</div>
    </div>
  );
};
