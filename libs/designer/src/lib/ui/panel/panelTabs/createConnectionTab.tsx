import constants from '../../../common/constants';
import { useSelectedNodeId } from '../../../core/state/panel/panelSelectors';
import { isolateTab, showDefaultTabs } from '../../../core/state/panel/panelSlice';
import { useConnectorByNodeId } from '../../../core/state/selectors/actionMetadataSelector';
import type { PanelTab } from '@microsoft/designer-ui';
import { CreateConnection } from '@microsoft/designer-ui';
import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

const CreateConnectionTab = () => {
  const dispatch = useDispatch();

  const nodeId = useSelectedNodeId();
  const connector = useConnectorByNodeId(nodeId);

  const createCallback = useCallback(() => {
    // TODO: Create the connection and select it
    dispatch(showDefaultTabs());
  }, [dispatch]);

  const cancelCallback = useCallback(() => {
    dispatch(isolateTab(constants.PANEL_TAB_NAMES.CONNECTION_SELECTOR));
  }, [dispatch]);

  return <CreateConnection connector={connector} createCallback={createCallback} cancelCallback={cancelCallback} />;
};

export const createConnectionTab: PanelTab = {
  title: 'Create Connection',
  name: constants.PANEL_TAB_NAMES.CONNECTION_CREATE,
  description: 'Create Connection Tab',
  visible: true,
  content: <CreateConnectionTab />,
  order: 0,
};
