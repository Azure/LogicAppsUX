import { XLargeText } from '@microsoft/designer-ui';
import type { AppDispatch } from '../../../../core';
import { useConnectionsForConnector } from '../../../../core/queries/connections';
import { useConnectionRefs, useConnector } from '../../../../core/state/connection/connectionSelector';
import { useIsCreatingConnection } from '../../../../core/state/panel/panelSelectors';
import { setIsCreatingConnection } from '../../../../core/state/panel/panelSlice';
import { CreateConnectionWrapper } from '../createConnection/createConnectionWrapperFromConnector';
import { SelectConnectionWrapper } from '../selectConnection/selectConnectionFromConnector';
import { Button } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { autoCreateConnectionIfPossible } from '../../../../core/actions/bjsworkflow/connections';
import type { Connection, Connector } from '@microsoft/logic-apps-shared';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

interface ConnectionsViewProps {
  closeView: () => void;
  connectorId: string;
  onConnectionSuccessful: (connection: Connection) => void;
}

export const ConnectionsView = (props: ConnectionsViewProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { connectorId } = props;
  const { data: connector } = useConnector(connectorId);
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

  const panelHeaderText = useMemo(() => {
    switch (panelStatus) {
      case 'select':
        return selectConnectionPanelHeader;
      case 'create':
        return createConnectionPanelHeader;
    }
  }, [createConnectionPanelHeader, panelStatus, selectConnectionPanelHeader]);

  const renderContent = useCallback(() => {
    switch (panelStatus) {
      case 'select':
        return (
          <SelectConnectionWrapper
            connectorId={connectorId}
            onConnectionSuccessful={props.onConnectionSuccessful}
            onConnectionClose={props.closeView}
          />
        );
      case 'create':
        return <CreateConnectionWrapper connectorId={connectorId} onConnectionSuccessful={props.onConnectionSuccessful} />;
    }
  }, [connectorId, panelStatus, props.closeView, props.onConnectionSuccessful]);

  return (
    <div style={{ padding: '10px' }}>
      <div className="msla-app-action-header">
        <XLargeText text={panelHeaderText} />
        <Button aria-label={closeButtonAriaLabel} appearance="subtle" onClick={props.closeView} icon={<CloseIcon />} />
      </div>
      <div className="msla-connections-panel-body">{renderContent()}</div>
    </div>
  );
};
