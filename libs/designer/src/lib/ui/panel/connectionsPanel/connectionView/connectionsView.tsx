import { XLargeText } from '@microsoft/designer-ui';
import type { AppDispatch } from '../../../../core';
import { useConnectionsForConnector } from '../../../../core/queries/connections';
import { useConnectionRefs, useConnector } from '../../../../core/state/connection/connectionSelector';
import { useIsCreatingConnection } from '../../../../core/state/panel/panelSelectors';
import { setIsCreatingConnection } from '../../../../core/state/panel/panelSlice';
import { CreateConnectionWrapper } from '../createConnection/createConnectionWrapperFromConnector';
import { SelectConnectionWrapper } from '../selectConnection/selectConnectionFromConnector';
import { Button, MessageBar, MessageBarBody, MessageBarTitle, Spinner, Text } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { autoCreateConnectionIfPossible } from '../../../../core/actions/bjsworkflow/connections';
import { ConnectionService, parseErrorMessage, type Connection, type Connector } from '@microsoft/logic-apps-shared';
import { useConnectionViewStyles } from './styles';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

interface ConnectionsViewProps {
  closeView: () => void;
  connectorName: string;
  connectorType: string;
  currentConnectionId: string;
  onConnectionSuccessful: (connection: Connection) => void;
}

export const ConnectionsView = (props: ConnectionsViewProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { connectorName, connectorType, currentConnectionId } = props;
  const styles = useConnectionViewStyles();

  // ccastrotrejo - need to check whether its manifest based before this
  const connectorId =
    connectorName === 'agent'
      ? '/connectionProviders/agent'
      : `${ConnectionService()?.getSubscriptionLocationWebUrl?.() ?? ''}/${connectorName}`;
  const connectorQuery = useConnector(connectorId);
  const connector = connectorQuery.data;
  const references = useConnectionRefs();
  const connectionQuery = useConnectionsForConnector(connector?.id ?? '');
  const connections = useMemo(() => connectionQuery.data ?? [], [connectionQuery.data]);
  const intl = useIntl();

  const isCreatingConnection = useIsCreatingConnection();

  useEffect(() => {
    if (connector && !connectionQuery.isLoading && !connectionQuery.isError && connections.length === 0) {
      autoCreateConnectionIfPossible({
        connector: connector as Connector,
        referenceKeys: Object.keys(references),
        operationInfo: undefined,
        skipOAuth: true,
        applyNewConnection: (connection: Connection) => props.onConnectionSuccessful(connection),
        onSuccess: () => props.closeView(),
        onManualConnectionCreation: () => dispatch(setIsCreatingConnection(true)),
      });
    }
  }, [connectionQuery.isError, connectionQuery.isLoading, connections, connector, dispatch, props, references]);

  const panelStatus = useMemo(() => {
    return isCreatingConnection ? 'create' : 'select';
  }, [isCreatingConnection]);

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
  const loadingConnectorText = intl.formatMessage({
    defaultMessage: 'Loading connector data...',
    id: 'i+FZxg',
    description: 'Message shown while loading connector metadata for the connection view',
  });
  const connectorLoadErrorTitle = intl.formatMessage({
    defaultMessage: 'Error loading connector',
    id: 'S6TcFA',
    description: 'Title shown when connector metadata cannot be loaded in the connection view',
  });
  const connectorNotFoundText = intl.formatMessage({
    defaultMessage: 'The connector could not be found.',
    id: 'ImBIsD',
    description: 'Error shown when no connector metadata is returned for the connection view',
  });
  const retryButtonText = intl.formatMessage({
    defaultMessage: 'Retry',
    id: 'ensbBh',
    description: 'Button text to retry loading connector metadata',
  });

  const panelHeaderText = useMemo(() => {
    switch (panelStatus) {
      case 'select':
        return selectConnectionPanelHeader;
      case 'create':
        return createConnectionPanelHeader;
    }
  }, [createConnectionPanelHeader, panelStatus, selectConnectionPanelHeader]);

  const renderContent = useCallback(() => {
    if (connectorQuery.isLoading) {
      return (
        <div className="msla-loading-container">
          <Spinner size="large" label={loadingConnectorText} />
        </div>
      );
    }

    if (connectorQuery.isError || !connector) {
      const errorMessage = connectorQuery.isError ? parseErrorMessage(connectorQuery.error) : connectorNotFoundText;
      return (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>{connectorLoadErrorTitle}</MessageBarTitle>
            <Text>{errorMessage}</Text>
            <Button appearance="transparent" onClick={() => connectorQuery.refetch()}>
              {retryButtonText}
            </Button>
          </MessageBarBody>
        </MessageBar>
      );
    }

    switch (panelStatus) {
      case 'select':
        return (
          <SelectConnectionWrapper
            connectorId={connectorId}
            currentConnectionId={currentConnectionId}
            connectorName={connectorName}
            onConnectionSuccessful={props.onConnectionSuccessful}
            onConnectionClose={props.closeView}
          />
        );
      case 'create':
        return (
          <CreateConnectionWrapper
            connectorId={connectorId}
            connectorType={connectorType}
            onConnectionSuccessful={props.onConnectionSuccessful}
          />
        );
    }
  }, [
    connector,
    connectorId,
    connectorLoadErrorTitle,
    connectorName,
    connectorNotFoundText,
    connectorQuery.error,
    connectorQuery.isError,
    connectorQuery.isLoading,
    connectorType,
    currentConnectionId,
    loadingConnectorText,
    panelStatus,
    props.closeView,
    props.onConnectionSuccessful,
    retryButtonText,
  ]);

  return (
    <div style={{ padding: '0 10px', overflowY: 'auto' }}>
      <div className={styles.appActionHeader}>
        <XLargeText text={panelHeaderText} />
        <Button aria-label={closeButtonAriaLabel} appearance="subtle" onClick={props.closeView} icon={<CloseIcon />} />
      </div>
      <div className="msla-connections-panel-body">{renderContent()}</div>
    </div>
  );
};
