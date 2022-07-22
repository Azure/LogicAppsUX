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

  const createConnectionCallback = useCallback(() => {
    // TODO: Create the connection and select it
    dispatch(showDefaultTabs());
  }, [dispatch]);

  const cancelCallback = useCallback(() => {
    dispatch(isolateTab(constants.PANEL_TAB_NAMES.CONNECTION_SELECTOR));
  }, [dispatch]);

  // By the time you get to this component, there should always be a connector associated
  if (connector === undefined) {
    dispatch(showDefaultTabs());
    return <p></p>;
  }

  return <CreateConnection connector={connector} createConnectionCallback={createConnectionCallback} cancelCallback={cancelCallback} />;
};

export const createConnectionTab: PanelTab = {
  title: 'Create Connection',
  name: constants.PANEL_TAB_NAMES.CONNECTION_CREATE,
  description: 'Create Connection Tab',
  visible: true,
  content: <CreateConnectionTab />,
  order: 0,
};
