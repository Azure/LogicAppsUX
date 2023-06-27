import constants from '../../../../common/constants';
import type { AppDispatch } from '../../../../core';
import { updateNodeConnection } from '../../../../core/actions/bjsworkflow/connections';
import { useConnectionsForConnector } from '../../../../core/queries/connections';
import { useConnectorByNodeId, useNodeConnectionId } from '../../../../core/state/connection/connectionSelector';
import { useIsXrmConnectionReferenceMode, useMonitoringView } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import { useSelectedNodeId } from '../../../../core/state/panel/panelSelectors';
import { isolateTab, selectPanelTab, showDefaultTabs } from '../../../../core/state/panel/panelSlice';
import { MessageBar, MessageBarType, Spinner, SpinnerSize } from '@fluentui/react';
import { ConnectionService } from '@microsoft/designer-client-services-logic-apps';
import type { PanelTab } from '@microsoft/designer-ui';
import { SelectConnection } from '@microsoft/designer-ui';
import type { Connection, Connector } from '@microsoft/utils-logic-apps';
import { useCallback, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

export const SelectConnectionTab = () => {
  const dispatch = useDispatch<AppDispatch>();

  const intl = useIntl();
  const selectedNodeId = useSelectedNodeId();
  const currentConnectionId = useNodeConnectionId(selectedNodeId);
  const isMonitoringView = useMonitoringView();
  const isXrmConnectionReferenceMode = useIsXrmConnectionReferenceMode();

  const hideConnectionTabs = useCallback(() => {
    dispatch(showDefaultTabs({ isMonitoringView }));
    dispatch(selectPanelTab(constants.PANEL_TAB_NAMES.PARAMETERS));
  }, [dispatch, isMonitoringView]);

  const createConnectionCallback = useCallback(() => {
    // This is getting called and showing create tab after adding a new operation under certain circumstances
    dispatch(isolateTab(constants.PANEL_TAB_NAMES.CONNECTION_CREATE));
  }, [dispatch]);

  const connector = useConnectorByNodeId(selectedNodeId);
  const connectionQuery = useConnectionsForConnector(connector?.id ?? '');
  const connections = useMemo(() => connectionQuery.data ?? [], [connectionQuery]);

  useEffect(() => {
    if (!connectionQuery.isLoading && !connectionQuery.isError && connections.length === 0) createConnectionCallback();
  }, [connectionQuery.isError, connectionQuery.isLoading, connections, createConnectionCallback]);

  // TODO: RILEY - WI# 15680356 - RACE CONDITION HERE, if you are on select connection and you click another node, this fires off, and sets the old node's connection to the same as the new node's connection
  // We really just need to make our own selection component here, using the 'DetailsList' component here is just really hacky and not the way it was intended to be used
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
      hideConnectionTabs();
    },
    [dispatch, selectedNodeId, connector, hideConnectionTabs]
  );

  const cancelSelectionCallback = useCallback(() => {
    hideConnectionTabs();
  }, [hideConnectionTabs]);

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading connection data...',
    description: 'Message to show under the loading icon when loading connection parameters',
  });

  if (connectionQuery.isLoading)
    return (
      <div className="msla-loading-container">
        <Spinner size={SpinnerSize.large} label={loadingText} />
      </div>
    );

  if (connectionQuery.isError)
    return <MessageBar messageBarType={MessageBarType.error}>{JSON.stringify(connectionQuery.error)}</MessageBar>;

  return (
    <SelectConnection
      connections={connections}
      currentConnectionId={currentConnectionId}
      saveSelectionCallback={saveSelectionCallback}
      cancelSelectionCallback={cancelSelectionCallback}
      createConnectionCallback={createConnectionCallback}
      isXrmConnectionReferenceMode={!!isXrmConnectionReferenceMode}
    />
  );
};

export function getSelectConnectionTab(title: string): PanelTab {
  return {
    title: title,
    name: constants.PANEL_TAB_NAMES.CONNECTION_SELECTOR,
    description: 'Select Connection Tab',
    visible: true,
    content: <SelectConnectionTab />,
    order: 0,
  };
}
