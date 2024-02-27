import constants from '../../../../../common/constants';
import { useSelectedNodeId } from '../../../../../core/state/panel/panelSelectors';
import { useIsMockSupported } from '../../../../../core/state/unitTest/unitTestSelectors';
import type { RootState } from '../../../../../core/store';
import { isRootNodeInGraph } from '../../../../../core/utils/graph';
import { OutputMocks } from '@microsoft/designer-ui';
import type { MockUpdateEvent, PanelTabFn } from '@microsoft/designer-ui';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';

export const MockResultsTab = () => {
  const nodeId = useSelectedNodeId();
  const isMockSupported = useIsMockSupported(nodeId);
  const isTriggerNode = useSelector((state: RootState) => isRootNodeInGraph(nodeId, 'root', state.workflow.nodesMetadata));
  const nodeName = isTriggerNode ? `&${nodeId}` : nodeId;
  const outputs = useSelector((state: RootState) => state.operations.outputParameters[nodeId]);

  const onMockUpdate = useCallback(
    (newState: MockUpdateEvent): void => {
      console.log('charlie', newState, nodeName);
    },
    [nodeName]
  );

  return <OutputMocks isMockSupported={isMockSupported} nodeId={nodeId} onMockUpdate={onMockUpdate} outputs={outputs.outputs} />;
};

export const mockResultsTab: PanelTabFn = (intl) => ({
  id: constants.PANEL_TAB_NAMES.MOCK_RESULTS,
  title: intl.formatMessage({
    defaultMessage: 'Mocked Results',
    description: 'The tab label for the mocked results tab on the operation panel',
  }),
  name: constants.PANEL_TAB_NAMES.MOCK_RESULTS,
  description: intl.formatMessage({
    defaultMessage: 'Mocked Results Tab',
    description: 'An accessability label that describes the mocked results tab',
  }),
  visible: true,
  content: <MockResultsTab />,
  order: 10,
  icon: 'Info',
});
