import constants from '../../../../../common/constants';
import { useSelectedNodeId } from '../../../../../core/state/panel/panelSelectors';
import { useMockResultsByOperation } from '../../../../../core/state/unitTest/unitTestSelectors';
import { addMockResult } from '../../../../../core/state/unitTest/unitTestSlice';
import type { AppDispatch, RootState } from '../../../../../core/store';
import { isRootNodeInGraph } from '../../../../../core/utils/graph';
import type { ChangeState, PanelTabFn } from '@microsoft/designer-ui';
import { CodeEditor, EditorLanguage } from '@microsoft/designer-ui';
import { isNullOrUndefined } from '@microsoft/utils-logic-apps';
import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export const MockResultsTab = () => {
  const nodeId = useSelectedNodeId();
  const isTriggerNode = useSelector((state: RootState) => isRootNodeInGraph(nodeId, 'root', state.workflow.nodesMetadata));
  const nodeName = isTriggerNode ? `&${nodeId}` : nodeId;
  const nodeMockResults = useMockResultsByOperation(nodeId);
  const mockResults = isNullOrUndefined(nodeMockResults) ? '' : nodeMockResults;

  const dispatch = useDispatch<AppDispatch>();

  const handleMockResultChange = useCallback(
    (newState: ChangeState): void => {
      dispatch(addMockResult({ operationName: nodeName, mockResult: newState.value[0].value }));
    },
    [nodeName, dispatch]
  );

  const getTokenPicker: any = () => {
    console.log('getTockerPicker'); // TODO(ccastrotreoj): Remove this =as this is just used for first iteration
  };

  const resultsEditor = useMemo(() => {
    return (
      <CodeEditor
        key={nodeName}
        initialValue={[{ id: nodeName, type: 'literal', value: mockResults }]}
        language={EditorLanguage.json}
        onChange={handleMockResultChange}
        readonly={false}
        getTokenPicker={getTokenPicker}
      />
    );
  }, [mockResults, handleMockResultChange, nodeName]);

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
