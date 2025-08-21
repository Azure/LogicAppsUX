import { useIsA2AWorkflow } from '../../../../core/state/designerView/designerViewSelectors';
import { useOperationInfo, type AppDispatch } from '../../../../core';
import { autoCreateConnectionIfPossible, updateNodeConnection } from '../../../../core/actions/bjsworkflow/connections';
import { useConnectionsForConnector } from '../../../../core/queries/connections';
import {
  useConnectionRefs,
  useConnectionRefsByConnectorId,
  useConnectorByNodeId,
  useNodeConnectionId,
} from '../../../../core/state/connection/connectionSelector';
import { useIsXrmConnectionReferenceMode } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import { useConnectionPanelSelectedNodeIds, usePreviousPanelMode } from '../../../../core/state/panel/panelSelectors';
import { openPanel, setIsCreatingConnection } from '../../../../core/state/panel/panelSlice';
import { ActionList } from '../actionList/actionList';
import { ConnectionTable, type ConnectionTableProps } from './connectionTable';
import { Body1Strong, Button, Divider, Spinner, MessageBar, MessageBarTitle, MessageBarBody, Text } from '@fluentui/react-components';
import {
  ConnectionService,
  equals,
  foundryServiceConnectionRegex,
  getIconUriFromConnector,
  parseErrorMessage,
  type Connection,
  type Connector,
} from '@microsoft/logic-apps-shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { AgentUtils } from '../../../../common/utilities/Utils';

export const SelectConnectionWrapper = () => {
  const dispatch = useDispatch<AppDispatch>();

  const intl = useIntl();
  const selectedNodeIds = useConnectionPanelSelectedNodeIds();
  const isA2A = useIsA2AWorkflow();
  const currentConnectionId = useNodeConnectionId(selectedNodeIds?.[0]); // only need to grab first one, they should all be the same
  const isXrmConnectionReferenceMode = useIsXrmConnectionReferenceMode();
  const referencePanelMode = usePreviousPanelMode();
  const [isInlineCreatingConnection, setIsInlineCreatingConnection] = useState(false);

  const closeConnectionsFlow = useCallback(() => {
    const panelMode = referencePanelMode ?? 'Operation';
    const nodeId = panelMode === 'Operation' ? selectedNodeIds?.[0] : undefined;
    dispatch(openPanel({ nodeId, panelMode }));
  }, [dispatch, referencePanelMode, selectedNodeIds]);

  const operationInfo = useOperationInfo(selectedNodeIds?.[0]);
  const connector = useConnectorByNodeId(selectedNodeIds?.[0]); // only need to grab first one, they should all be the same
  const connectorIconUri = useMemo(() => getIconUriFromConnector(connector), [connector]);
  const connectionQuery = useConnectionsForConnector(connector?.id ?? '');
  const connectionReferencesForConnector = useConnectionRefsByConnectorId(connector?.id ?? '');
  const connections = useMemo(() => {
    const connectionData = connectionQuery?.data ?? [];

    if (!isA2A) {
      // Filter out dynamic connections
      return connectionData.filter((c) => !equals(c.properties.feature ?? '', 'DynamicUserInvoked', true));
    }

    if (isA2A && AgentUtils.isConnector(connector?.id)) {
      // For A2A, hide the foundry connection from the list
      return connectionData.filter((c) => {
        const connectionReference = connectionReferencesForConnector.find((ref) => equals(ref.connection.id, c?.id, true));
        if (connectionReference?.resourceId) {
          return !foundryServiceConnectionRegex.test(connectionReference.resourceId ?? '');
        }

        return true;
      });
    }

    return connectionData;
  }, [connectionQuery?.data, connector?.id, isA2A, connectionReferencesForConnector]);
  const references = useConnectionRefs();

  const saveSelectionCallback = useCallback(
    (connection?: Connection) => {
      if (!connection) {
        return;
      }
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

  const createConnectionCallback = useCallback(() => {
    setIsInlineCreatingConnection(true);
    autoCreateConnectionIfPossible({
      connector: connector as Connector,
      operationInfo,
      referenceKeys: Object.keys(references),
      skipOAuth: true,
      applyNewConnection: saveSelectionCallback,
      onSuccess: closeConnectionsFlow,
      onManualConnectionCreation: () => {
        setIsInlineCreatingConnection(false);
        dispatch(setIsCreatingConnection(true));
      },
    });
  }, [closeConnectionsFlow, connector, dispatch, operationInfo, references, saveSelectionCallback]);

  useEffect(() => {
    if (!connectionQuery.isLoading && !connectionQuery.isError && connections.length === 0) {
      createConnectionCallback();
    }
  }, [connectionQuery.isError, connectionQuery.isLoading, connections, connector, createConnectionCallback]);

  const actionBar = useMemo(() => {
    return (
      <>
        <ActionList nodeIds={selectedNodeIds} iconUri={connectorIconUri} />
        <Divider />
      </>
    );
  }, [connectorIconUri, selectedNodeIds]);
  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading connection data...',
    id: 'faUrud',
    description: 'Message to show under the loading icon when loading connection parameters',
  });

  const buttonAddText = intl.formatMessage({
    defaultMessage: 'Add new',
    id: 'Lft/is',
    description: 'Button to add a new connection',
  });

  const buttonAddingText = intl.formatMessage({
    defaultMessage: 'Adding new connection...',
    id: 'aPxsVd',
    description: 'Button text for adding a new connection',
  });

  if (connectionQuery.isLoading) {
    return (
      <div className="msla-loading-container">
        <Spinner size={'large'} label={loadingText} />
      </div>
    );
  }

  return (
    <SelectConnection
      connections={connections}
      currentConnectionId={currentConnectionId}
      saveSelectionCallback={saveSelectionCallback}
      cancelSelectionCallback={closeConnectionsFlow}
      isXrmConnectionReferenceMode={!!isXrmConnectionReferenceMode}
      addButton={{
        text: isInlineCreatingConnection ? buttonAddingText : buttonAddText,
        disabled: isInlineCreatingConnection,
        onAdd: createConnectionCallback,
      }}
      cancelButton={{ onCancel: closeConnectionsFlow }}
      actionBar={actionBar}
      errorMessage={connectionQuery.isError ? parseErrorMessage(connectionQuery.error) : undefined}
    />
  );
};

export const SelectConnection = ({
  addButton,
  cancelButton,
  actionBar,
  errorMessage,
  connections,
  currentConnectionId,
  saveSelectionCallback,
  cancelSelectionCallback,
  isXrmConnectionReferenceMode,
}: ConnectionTableProps & {
  addButton: {
    text: string;
    disabled?: boolean;
    onAdd: () => void;
  };
  cancelButton?: { onCancel: () => void };
  actionBar?: JSX.Element;
  errorMessage?: string;
}) => {
  const intl = useIntl();
  const connectionLoadErrorTitle = intl.formatMessage({
    defaultMessage: 'Error loading connections',
    id: 'HQ/HhZ',
    description: 'Title for error message when loading connections',
  });
  const description = isXrmConnectionReferenceMode
    ? intl.formatMessage({
        defaultMessage: 'Select an existing connection reference or create a new one',
        id: 'ZAdaBl',
        description: 'Select an existing connection reference or create a new one.',
      })
    : intl.formatMessage({
        defaultMessage: 'Select an existing connection or create a new one',
        id: 'DfXxoX',
        description: 'Select an existing connection or create a new one.',
      });

  const buttonAddAria = intl.formatMessage({
    defaultMessage: 'Add a new connection',
    id: '4Q7WzU',
    description: 'Aria label description for add button',
  });
  const buttonCancelText = intl.formatMessage({
    defaultMessage: 'Cancel',
    id: 'wF7C+h',
    description: 'Button to cancel a connection',
  });

  const buttonCancelAria = intl.formatMessage({
    defaultMessage: 'Cancel the selection',
    id: 'GtDOFg',
    description: 'Aria label description for cancel button',
  });
  return (
    <div className="msla-edit-connection-container">
      {actionBar ? actionBar : null}

      {errorMessage ? (
        <MessageBar intent={'error'}>
          <MessageBarBody>
            <MessageBarTitle>{connectionLoadErrorTitle}</MessageBarTitle>
            <Text>{errorMessage}</Text>
          </MessageBarBody>
        </MessageBar>
      ) : (
        <>
          <Body1Strong>{description}</Body1Strong>
          <ConnectionTable
            connections={connections}
            currentConnectionId={currentConnectionId}
            saveSelectionCallback={saveSelectionCallback}
            cancelSelectionCallback={cancelSelectionCallback}
            isXrmConnectionReferenceMode={!!isXrmConnectionReferenceMode}
          />
        </>
      )}

      <div className="msla-edit-connection-actions-container">
        <Button aria-label={buttonAddAria} disabled={addButton.disabled} onClick={addButton.onAdd}>
          {addButton.text}
        </Button>
        {cancelButton ? (
          <Button aria-label={buttonCancelAria} onClick={cancelButton.onCancel}>
            {buttonCancelText}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
