import { type AppDispatch, useSelectedNodeId } from '../../../../core';
import { updateNodeConnection } from '../../../../core/actions/bjsworkflow/connections';
import { useConnectionsForConnector } from '../../../../core/queries/connections';
import { useNodeConnectionId, useConnectorByNodeId } from '../../../../core/state/connection/connectionSelector';
import { useIsXrmConnectionReferenceMode } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import { setIsCreatingConnection, switchToOperationPanel } from '../../../../core/state/panel/panelSlice';
import { ConnectionTable } from './connectionTable';
import { MessageBar, MessageBarType } from '@fluentui/react';
import { Button, Spinner, Text } from '@fluentui/react-components';
import { ConnectionService } from '@microsoft/designer-client-services-logic-apps';
import type { Connection, Connector } from '@microsoft/utils-logic-apps';
import { useCallback, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

export const SelectConnection = () => {
  const dispatch = useDispatch<AppDispatch>();

  const intl = useIntl();
  const selectedNodeId = useSelectedNodeId();
  const currentConnectionId = useNodeConnectionId(selectedNodeId);
  const isXrmConnectionReferenceMode = useIsXrmConnectionReferenceMode();

  const closeConnectionsFlow = useCallback(() => {
    dispatch(switchToOperationPanel(selectedNodeId));
  }, [dispatch, selectedNodeId]);

  const createConnectionCallback = useCallback(() => {
    dispatch(setIsCreatingConnection(true));
  }, [dispatch]);

  const connector = useConnectorByNodeId(selectedNodeId);
  const connectionQuery = useConnectionsForConnector(connector?.id ?? '');
  const connections = useMemo(() => connectionQuery.data ?? [], [connectionQuery]);

  useEffect(() => {
    if (!connectionQuery.isLoading && !connectionQuery.isError && connections.length === 0) createConnectionCallback();
  }, [connectionQuery.isError, connectionQuery.isLoading, connections, createConnectionCallback]);

  const saveSelectionCallback = useCallback(
    (connection?: Connection) => {
      if (!connection) return;
      dispatch(
        updateNodeConnection({
          nodeId: selectedNodeId,
          connection,
          connector: connector as Connector,
        })
      );
      ConnectionService().setupConnectionIfNeeded(connection);
      closeConnectionsFlow();
    },
    [dispatch, selectedNodeId, connector, closeConnectionsFlow]
  );

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading connection data...',
    description: 'Message to show under the loading icon when loading connection parameters',
  });

  const componentDescription = isXrmConnectionReferenceMode
    ? intl.formatMessage({
        defaultMessage: 'Select an existing connection reference or create a new one.',
        description: 'Select an existing connection reference or create a new one.',
      })
    : intl.formatMessage({
        defaultMessage: 'Select an existing connection or create a new one.',
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
    <div className="msla-select-connections-container">
      <Text>{componentDescription}</Text>

      <ConnectionTable
        connections={connections}
        currentConnectionId={currentConnectionId}
        saveSelectionCallback={saveSelectionCallback}
        cancelSelectionCallback={closeConnectionsFlow}
        createConnectionCallback={createConnectionCallback}
        isXrmConnectionReferenceMode={!!isXrmConnectionReferenceMode}
      />

      <div className="msla-select-connection-actions-container">
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
