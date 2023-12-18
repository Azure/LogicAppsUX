import { type AppDispatch, getIconUriFromConnector } from '../../../../core';
import { updateNodeConnection } from '../../../../core/actions/bjsworkflow/connections';
import { useConnectionsForConnector } from '../../../../core/queries/connections';
import { useNodeConnectionId, useConnectorByNodeId } from '../../../../core/state/connection/connectionSelector';
import { useIsXrmConnectionReferenceMode } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import { useReferencePanelMode, useSelectedNodeIds } from '../../../../core/state/panel/panelSelectors';
import { openPanel, setIsCreatingConnection } from '../../../../core/state/panel/panelSlice';
import { ActionList } from '../actionList/actionList';
import { ConnectionTable } from './connectionTable';
import { MessageBar, MessageBarType } from '@fluentui/react';
import { Body1Strong, Button, Divider, Spinner } from '@fluentui/react-components';
import { ConnectionService } from '@microsoft/designer-client-services-logic-apps';
import { type Connection, type Connector } from '@microsoft/utils-logic-apps';
import { useCallback, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

export const SelectConnection = () => {
  const dispatch = useDispatch<AppDispatch>();

  const intl = useIntl();
  const selectedNodeIds = useSelectedNodeIds();
  const currentConnectionId = useNodeConnectionId(selectedNodeIds?.[0]); // only need to grab first one, they should all be the same
  const isXrmConnectionReferenceMode = useIsXrmConnectionReferenceMode();
  const referencePanelMode = useReferencePanelMode();

  const closeConnectionsFlow = useCallback(() => {
    const panelMode = referencePanelMode ?? 'Operation';
    const nodeId = panelMode === 'Operation' ? selectedNodeIds?.[0] : undefined;
    dispatch(openPanel({ nodeId, panelMode }));
  }, [dispatch, referencePanelMode, selectedNodeIds]);

  const createConnectionCallback = useCallback(() => {
    dispatch(setIsCreatingConnection(true));
  }, [dispatch]);

  const connector = useConnectorByNodeId(selectedNodeIds?.[0]); // only need to grab first one, they should all be the same
  const connectorIconUri = useMemo(() => getIconUriFromConnector(connector), [connector]);
  const connectionQuery = useConnectionsForConnector(connector?.id ?? '');
  const connections = useMemo(() => connectionQuery.data ?? [], [connectionQuery]);

  useEffect(() => {
    if (!connectionQuery.isLoading && !connectionQuery.isError && connections.length === 0) createConnectionCallback();
  }, [connectionQuery.isError, connectionQuery.isLoading, connections, createConnectionCallback]);

  const saveSelectionCallback = useCallback(
    (connection?: Connection) => {
      if (!connection) return;
      for (const nodeId of selectedNodeIds) {
        dispatch(
          updateNodeConnection({
            nodeId,
            connection,
            connector: connector as Connector,
          })
        );
        ConnectionService().setupConnectionIfNeeded(connection);
      }
      closeConnectionsFlow();
    },
    [dispatch, selectedNodeIds, connector, closeConnectionsFlow]
  );

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading connection data...',
    description: 'Message to show under the loading icon when loading connection parameters',
  });

  const componentDescription = isXrmConnectionReferenceMode
    ? intl.formatMessage({
        defaultMessage: 'Select an existing connection reference or create a new one',
        description: 'Select an existing connection reference or create a new one.',
      })
    : intl.formatMessage({
        defaultMessage: 'Select an existing connection or create a new one',
        description: 'Select an existing connection or create a new one.',
      });

  const buttonAddText = intl.formatMessage({
    defaultMessage: 'Add new',
    description: 'Button to add a new connection',
  });

  const buttonAddAria = intl.formatMessage({
    defaultMessage: 'Add a new connection',
    description: 'Aria label description for add button',
  });

  const buttonCancelText = intl.formatMessage({
    defaultMessage: 'Cancel',
    description: 'Button to cancel a connection',
  });

  const buttonCancelAria = intl.formatMessage({
    defaultMessage: 'Cancel the selection',
    description: 'Aria label description for cancel button',
  });

  if (connectionQuery.isLoading)
    return (
      <div className="msla-loading-container">
        <Spinner size={'large'} label={loadingText} />
      </div>
    );

  if (connectionQuery.isError)
    return <MessageBar messageBarType={MessageBarType.error}>{JSON.stringify(connectionQuery.error)}</MessageBar>;

  return (
    <div className="msla-edit-connection-container">
      <ActionList nodeIds={selectedNodeIds} iconUri={connectorIconUri} />
      <Divider />

      <Body1Strong>{componentDescription}</Body1Strong>
      <ConnectionTable
        connections={connections}
        currentConnectionId={currentConnectionId}
        saveSelectionCallback={saveSelectionCallback}
        cancelSelectionCallback={closeConnectionsFlow}
        createConnectionCallback={createConnectionCallback}
        isXrmConnectionReferenceMode={!!isXrmConnectionReferenceMode}
      />

      <div className="msla-edit-connection-actions-container">
        <Button aria-label={buttonAddAria} onClick={createConnectionCallback}>
          {buttonAddText}
        </Button>
        <Button aria-label={buttonCancelAria} onClick={closeConnectionsFlow}>
          {buttonCancelText}
        </Button>
      </div>
    </div>
  );
};
