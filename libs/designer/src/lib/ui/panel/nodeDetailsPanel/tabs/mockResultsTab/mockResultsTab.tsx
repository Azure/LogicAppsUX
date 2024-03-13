import { Constants } from '../../../../../../../src/lib';
import { convertVariableTypeToSwaggerType } from '../../../../../../lib/core/utils/variables';
import constants from '../../../../../common/constants';
import { useSelectedNodeId } from '../../../../../core/state/panel/panelSelectors';
import {
  useMocksValidationErrors,
  useIsMockSupported,
  useMockResultsByOperation,
} from '../../../../../core/state/unitTest/unitTestSelectors';
import { updateActionResult, updateOutputMock } from '../../../../../core/state/unitTest/unitTestSlice';
import type { AppDispatch, RootState } from '../../../../../core/store';
import { isRootNodeInGraph } from '../../../../../core/utils/graph';
import { getParameterEditorProps } from '../../../../../core/utils/parameters/helper';
import { type OutputInfo } from '@microsoft/designer-client-services-logic-apps';
import { OutputMocks, type PanelTabFn, type ActionResultUpdateEvent, type ChangeState, ArrayType } from '@microsoft/designer-ui';
import { isNullOrUndefined } from '@microsoft/utils-logic-apps';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export const MockResultsTab = () => {
  const nodeId = useSelectedNodeId();
  const isTrigger = useSelector((state: RootState) => isRootNodeInGraph(nodeId, 'root', state.workflow.nodesMetadata));
  const isMockSupported = useIsMockSupported(nodeId, isTrigger);
  const nodeName = isTrigger ? `&${nodeId}` : nodeId;
  const rawOutputs = useSelector((state: RootState) => state.operations.outputParameters[nodeId]);
  const dispatch = useDispatch<AppDispatch>();
  const mockResults = useMockResultsByOperation(nodeName);
  const mocksValidationErrors = useMocksValidationErrors();

  const filteredOutputs: OutputInfo[] = Object.values(rawOutputs.outputs)
    .filter((output: OutputInfo) => {
      return !output.isInsideArray ?? true;
    })
    .filter((output: OutputInfo, _index: number, outputArray: OutputInfo[]) => {
      const hasChildren = outputArray.some((o: OutputInfo) => (o.key === output.key ? false : o.key.includes(output.key)));
      return !hasChildren;
    });

  const onMockUpdate = useCallback(
    (id: string, newState: ChangeState, type: string) => {
      const { value, viewModel } = newState;
      const propertiesToUpdate = { value };
      if (!isNullOrUndefined(viewModel) && viewModel.arrayType === ArrayType.COMPLEX) {
        propertiesToUpdate.value = viewModel.uncastedValue;
      }
      dispatch(
        updateOutputMock({ operationName: nodeName, outputs: propertiesToUpdate.value ?? [], outputId: id, completed: true, type: type })
      );
    },
    [nodeName, dispatch]
  );

  const onActionResultUpdate = useCallback(
    (newState: ActionResultUpdateEvent): void => {
      dispatch(updateActionResult({ operationName: nodeName, actionResult: newState.actionResult, completed: true }));
    },
    [nodeName, dispatch]
  );

  const outputs = filteredOutputs.map((output: OutputInfo) => {
    const { key: id, title: label, type } = output;
    const { editor, editorOptions, editorViewModel, schema } = getParameterEditorProps(output, [], true);
    const value = mockResults?.output[id] ?? [];
    const valueViewModel = { ...editorViewModel, uncastedValue: value };
    const validationErrors = mocksValidationErrors[`${nodeName}-${id}`] ?? {};

    return {
      id,
      label,
      required: false,
      readOnly: false,
      value: value,
      editor: editor ?? convertVariableTypeToSwaggerType(type) ?? Constants.SWAGGER.TYPE.ANY,
      editorOptions,
      schema,
      tokenEditor: false,
      isLoading: false,
      editorViewModel: valueViewModel,
      showTokens: false,
      tokenMapping: [],
      validationErrors,
      suppressCastingForSerialize: false,
      onValueChange: (newState: ChangeState) => onMockUpdate(id, newState, type),
    };
  });

  return (
    <OutputMocks
      isMockSupported={isMockSupported}
      nodeId={nodeId}
      onActionResultUpdate={onActionResultUpdate}
      outputs={outputs}
      mocks={mockResults}
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
