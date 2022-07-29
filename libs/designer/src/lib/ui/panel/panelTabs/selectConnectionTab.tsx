import constants from '../../../common/constants';
import { useConnectionsForConnector } from '../../../core/queries/connections';
import { useSelectedNodeId } from '../../../core/state/panel/panelSelectors';
import { isolateTab, selectPanelTab, showDefaultTabs } from '../../../core/state/panel/panelSlice';
import { useConnectorByNodeId, useNodeConnectionName } from '../../../core/state/selectors/actionMetadataSelector';
import type { Connection } from '@microsoft-logic-apps/utils';
import type { PanelTab } from '@microsoft/designer-ui';
import { SelectConnection } from '@microsoft/designer-ui';
import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';

export const SelectConnectionTab = () => {
  const dispatch = useDispatch();

  const selectedNodeId = useSelectedNodeId();
  const currentConnectionName = useNodeConnectionName(selectedNodeId);

  const hideConnectionTabs = useCallback(() => {
    dispatch(showDefaultTabs());
    dispatch(selectPanelTab(constants.PANEL_TAB_NAMES.PARAMETERS));
  }, [dispatch]);

  const createConnectionCallback = useCallback(() => {
    dispatch(isolateTab(constants.PANEL_TAB_NAMES.CONNECTION_CREATE));
  }, [dispatch]);

  const connector = useConnectorByNodeId(selectedNodeId);
  const connectionQuery = useConnectionsForConnector(connector?.id ?? '');
  const connections = useMemo(() => connectionQuery.data ?? [], [connectionQuery]);
  const currentConnection = connections.find((c) => c.properties.displayName === currentConnectionName.result);

  useEffect(() => {
    if (connections.length === 0) createConnectionCallback();
  }, [connections, createConnectionCallback]);

  const saveSelectionCallback = useCallback(
    (_connection?: Connection) => {
      // TODO: Send the actual connection selection to backend
      hideConnectionTabs();
    },
    [hideConnectionTabs]
  );

  const cancelSelectionCallback = useCallback(() => {
    hideConnectionTabs();
  }, [hideConnectionTabs]);

  return (
    <SelectConnection
      connections={connections}
      currentConnection={currentConnection}
      saveSelectionCallback={saveSelectionCallback}
      cancelSelectionCallback={cancelSelectionCallback}
      createConnectionCallback={createConnectionCallback}
    />
  );
};

export const selectConnectionTab: PanelTab = {
  title: 'Select Connection',
  name: constants.PANEL_TAB_NAMES.CONNECTION_SELECTOR,
  description: 'Select Connection Tab',
  visible: true,
  content: <SelectConnectionTab />,
  order: 0,
};
