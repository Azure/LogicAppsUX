import constants from '../../../../../common/constants';
import { useSelectedNodeId } from '../../../../../core/state/panel/panelSelectors';
import { useMockResultsByOperation } from '../../../../../core/state/unitTest/unitTestSelectors';
import { addMockResult } from '../../../../../core/state/unitTest/unitTestSlice';
import type { AppDispatch, RootState } from '../../../../../core/store';
import { isRootNodeInGraph } from '../../../../../core/utils/graph';
import type { PanelTabFn } from '@microsoft/designer-ui';
import { Peek } from '@microsoft/designer-ui';
import { isNullOrUndefined } from '@microsoft/utils-logic-apps';
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export const MockResultsTab = () => {
  const nodeId = useSelectedNodeId();
  const isTriggerNode = useSelector((state: RootState) => isRootNodeInGraph(nodeId, 'root', state.workflow.nodesMetadata));
  const operationName = isTriggerNode ? `&${nodeId}` : nodeId;
  const nodeMockResults = useMockResultsByOperation(nodeId);
  const mockResults = isNullOrUndefined(nodeMockResults) ? '' : nodeMockResults;

  const dispatch = useDispatch<AppDispatch>();

  const handleMockResultChange = useCallback(
    (updatedMockResult: string): void => {
      // TODO(ccastrotrejo): Small bug when empty string is passed in,
      // but will remove it since we are not going to user the Peek component anymore
      if (updatedMockResult === '') {
        return;
      }
      dispatch(addMockResult({ operationName, mockResult: updatedMockResult }));
    },
    [operationName, dispatch, addMockResult]
  );

  const resultsEditor = useMemo(() => {
    return <Peek input={mockResults} isReadOnly={false} onContentChanged={handleMockResultChange} />;
  }, [mockResults, handleMockResultChange]);

  return resultsEditor;
};

export const mockResultsTab: PanelTabFn = (intl) => ({
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
