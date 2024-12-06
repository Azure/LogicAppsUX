import type { OutputInfo } from '@microsoft/logic-apps-shared';
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { Constants, useOperationPanelSelectedNodeId } from '../../../../../../../src/lib';
import { convertVariableTypeToSwaggerType } from '../../../../../../lib/core/utils/variables';
import constants from '../../../../../common/constants';
import {
  useMocksValidationErrors,
  useIsMockSupported,
  useMocksByOperation,
  useNodeType,
} from '../../../../../core/state/unitTest/unitTestSelectors';
import {
  updateMockSuccess,
  updateMockFailure,
  updateActionResultFailure,
  updateActionResultSuccess,
} from '../../../../../core/state/unitTest/unitTestSlice';
import type { AppDispatch, RootState } from '../../../../../core/store';
import { isRootNodeInGraph } from '../../../../../core/utils/graph';
import { getParameterEditorProps } from '../../../../../core/utils/parameters/helper';
import {
  OutputMocks,
  type PanelTabFn,
  type ActionResultUpdateEvent,
  type ChangeState,
  ArrayType,
  type OutputsField,
  ActionResults,
} from '@microsoft/designer-ui';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getFilteredOutputs } from './helper';

const MockResultsTab = () => {
  const nodeId = useOperationPanelSelectedNodeId();
  const isTrigger = useSelector((state: RootState) => isRootNodeInGraph(nodeId, 'root', state.workflow.nodesMetadata));
  const nodeType = useNodeType(nodeId);
  const isMockSupported = useIsMockSupported(nodeId, isTrigger);
  const nodeName = isTrigger ? `&${nodeId}` : nodeId;
  const rawOutputs = useSelector((state: RootState) => state.operations.outputParameters[nodeId]);
  const dispatch = useDispatch<AppDispatch>();
  const mocks = useMocksByOperation(nodeName);
  const mocksValidationErrors = useMocksValidationErrors();

  const filteredOutputs: OutputInfo[] = getFilteredOutputs(rawOutputs.outputs, nodeType);

  const onMockUpdate = useCallback(
    (id: string, newState: ChangeState, type: string) => {
      const { value, viewModel } = newState;
      const propertiesToUpdate = { value };
      if (!isNullOrUndefined(viewModel) && viewModel.arrayType === ArrayType.COMPLEX) {
        propertiesToUpdate.value = viewModel.uncastedValue;
      }

      if (mocks.actionResult === ActionResults.FAILED) {
        dispatch(
          updateMockFailure({
            operationName: nodeName,
            outputs: id === 'errorMessage' || id === 'errorCode' ? [] : (propertiesToUpdate.value ?? []),
            outputId: id,
            completed: true,
            type: type,
            errorMessage: id === 'errorMessage' ? (value as unknown as string) : mocks.errorMessage,
            errorCode: id === 'errorCode' ? (value as unknown as string) : mocks.errorCode,
          })
        );
      } else {
        dispatch(
          updateMockSuccess({
            operationName: nodeName,
            outputs: propertiesToUpdate.value ?? [],
            outputId: id,
            completed: true,
            type: type,
          })
        );
      }
    },
    [dispatch, mocks?.actionResult, mocks?.errorCode, mocks?.errorMessage, nodeName]
  );

  const onActionResultUpdate = useCallback(
    (newState: ActionResultUpdateEvent): void => {
      if (newState.actionResult === ActionResults.FAILED) {
        dispatch(
          updateActionResultFailure({
            operationName: nodeName,
            actionResult: newState.actionResult,
            completed: true,
            errorMessage: mocks.errorMessage,
            errorCode: mocks.errorCode,
          })
        );
      } else {
        dispatch(
          updateActionResultSuccess({
            operationName: nodeName,
            actionResult: newState.actionResult,
            completed: true,
          })
        );
      }
    },
    [nodeName, dispatch, mocks?.errorMessage, mocks?.errorCode]
  );

  const outputs: OutputsField[] = filteredOutputs.map((output: OutputInfo) => {
    const { key: id, title: label, type } = output;
    const { editor, editorOptions, editorViewModel, schema } = getParameterEditorProps(output, [], true);
    const value = mocks?.output[id] ?? [];
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
      tokenMapping: {},
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
      mocks={mocks}
      errorMessage={mocks?.errorMessage ?? ''}
      errorCode={mocks?.errorCode ?? ''}
      onMockUpdate={onMockUpdate}
    />
  );
};

export const mockResultsTab: PanelTabFn = (intl) => ({
  id: constants.PANEL_TAB_NAMES.MOCK_RESULTS,
  title: intl.formatMessage({
    defaultMessage: 'Mocked Results',
    id: 'lC+EbT',
    description: 'The tab label for the mocked results tab on the operation panel',
  }),
  name: constants.PANEL_TAB_NAMES.MOCK_RESULTS,
  description: intl.formatMessage({
    defaultMessage: 'Mocked Results Tab',
    id: 'U7UAV0',
    description: 'An accessibility label that describes the mocked results tab',
  }),
  visible: true,
  content: <MockResultsTab />,
  order: 10,
  icon: 'Info',
});
