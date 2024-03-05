import { Constants } from '../../../../../../../src/lib';
import { convertVariableTypeToSwaggerType } from '../../../../../../lib/core/utils/variables';
import constants from '../../../../../common/constants';
import { useSelectedNodeId } from '../../../../../core/state/panel/panelSelectors';
import { useIsMockSupported, useMockResultsByOperation } from '../../../../../core/state/unitTest/unitTestSelectors';
import { updateOutputMock } from '../../../../../core/state/unitTest/unitTestSlice';
import type { AppDispatch, RootState } from '../../../../../core/store';
import { isRootNodeInGraph } from '../../../../../core/utils/graph';
import { getParameterEditorProps } from '../../../../../core/utils/parameters/helper';
import { type OutputInfo } from '@microsoft/designer-client-services-logic-apps';
import { type MockUpdateEvent, OutputMocks, type PanelTabFn } from '@microsoft/designer-ui';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export const MockResultsTab = () => {
  const nodeId = useSelectedNodeId();
  const isTrigger = useSelector((state: RootState) => isRootNodeInGraph(nodeId, 'root', state.workflow.nodesMetadata));
  const isMockSupported = useIsMockSupported(nodeId, isTrigger);
  const nodeName = isTrigger ? `&${nodeId}` : nodeId;
  const rawOutputs = useSelector((state: RootState) => state.operations.outputParameters[nodeId]);
  const dispatch = useDispatch<AppDispatch>();
  const outputsMock = useMockResultsByOperation(nodeName);

  const outputs = Object.values(rawOutputs.outputs).map((output: OutputInfo) => {
    const { key: id, title: label, required, type } = output;
    const { editor, editorOptions, editorViewModel, schema } = getParameterEditorProps(output, [], true);

    return {
      id,
      label,
      required,
      readOnly: false,
      value: [],
      editor: editor ?? convertVariableTypeToSwaggerType(type) ?? Constants.SWAGGER.TYPE.ANY,
      editorOptions,
      schema,
      tokenEditor: false,
      isLoading: false,
      editorViewModel,
      showTokens: false,
      tokenMapping: [],
      suppressCastingForSerialize: false,
    };
  });

  const onMockUpdate = useCallback(
    (newState: MockUpdateEvent): void => {
      dispatch(updateOutputMock({ operationName: nodeName, mockResult: { output: newState.id, actionResult: newState.actionResult } }));
    },
    [nodeName, dispatch]
  );

  return (
    <OutputMocks
      isMockSupported={isMockSupported}
      nodeId={nodeId}
      onMockUpdate={onMockUpdate}
      outputs={outputs}
      outputsMock={outputsMock}
    />
  );
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
