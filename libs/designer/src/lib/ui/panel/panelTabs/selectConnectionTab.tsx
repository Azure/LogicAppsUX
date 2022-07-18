import constants from '../../../common/constants';
import { useConnectionsForConnector } from '../../../core/queries/connections';
import { isolateTab, selectPanelTab, showDefaultTabs } from '../../../core/state/panel/panelSlice';
import { useConnectorByNodeId, useNodeConnectionName } from '../../../core/state/selectors/actionMetadataSelector';
import type { RootState } from '../../../core/store';
import type { Connection } from '@microsoft-logic-apps/utils';
import type { PanelTab } from '@microsoft/designer-ui';
import { SelectConnection } from '@microsoft/designer-ui';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export const SelectConnectionTab = () => {
  const dispatch = useDispatch();

  const selectedNodeId = useSelector((state: RootState) => state.panel.selectedNode);
  const currentConnectionName = useNodeConnectionName(selectedNodeId);

  const hideConnectionTabs = useCallback(() => {
    dispatch(showDefaultTabs());
  }, [dispatch]);

  const createNewConnectionCallback = useCallback(() => {
    dispatch(isolateTab(constants.PANEL_TAB_NAMES.CONNECTION_CREATE));
  }, [dispatch]);

  const connector = useConnectorByNodeId(selectedNodeId);
  const connections = useConnectionsForConnector(connector?.id ?? '').data ?? [];
  const currentConnection = connections.find((c) => c.properties.displayName === currentConnectionName.result);

  const saveSelectionCallback = useCallback(
    (_connection?: Connection) => {
      // TODO: Send the actual connection selection to backend
      hideConnectionTabs();
      dispatch(selectPanelTab(constants.PANEL_TAB_NAMES.PARAMETERS));
    },
    [dispatch, hideConnectionTabs]
  );

  const cancelSelectionCallback = useCallback(() => {
    hideConnectionTabs();
    dispatch(selectPanelTab(constants.PANEL_TAB_NAMES.PARAMETERS));
  }, [dispatch, hideConnectionTabs]);

  return (
    <SelectConnection
      connections={connections}
      currentConnection={currentConnection}
      saveSelectionCallback={saveSelectionCallback}
      cancelSelectionCallback={cancelSelectionCallback}
      createNewConnectionCallback={createNewConnectionCallback}
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
