import type { OutputInfo } from '@microsoft/logic-apps-shared';
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { Constants } from '../../../../../../../src/lib';
import { convertVariableTypeToSwaggerType } from '../../../../../../lib/core/utils/variables';
import constants from '../../../../../common/constants';
import { useSelectedNodeId } from '../../../../../core/state/panel/panelSelectors';
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
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getFilteredOutputs } from './helper';

const MockResultsTab = () => {
  const nodeId = useSelectedNodeId();
  const isTrigger = useSelector((state: RootState) => isRootNodeInGraph(nodeId, 'root', state.workflow.nodesMetadata));
  const nodeType = useNodeType(nodeId);
  const isMockSupported = useIsMockSupported(nodeId, isTrigger);
  const nodeName = isTrigger ? `&${nodeId}` : nodeId;
  const rawOutputs = useSelector((state: RootState) => state.operations.outputParameters[nodeId]);
  const dispatch = useDispatch<AppDispatch>();
  const mocks = useMocksByOperation(nodeName);
  const mocksValidationErrors = useMocksValidationErrors();

  const [errorMessage, setErrorMessage] = useState<string>(mocks.errorMessage || '');
  const [errorCode, setErrorCode] = useState<string>(mocks.errorCode || '');

  const filteredOutputs: OutputInfo[] = getFilteredOutputs(rawOutputs.outputs, nodeType);

  useEffect(() => {
    console.log('Component rendered with mocks:', mocks);
  }, [mocks]);

  const onMockUpdate = useCallback(
    (id: string, newState: ChangeState, type: string) => {
      const { value, viewModel } = newState;
      const propertiesToUpdate = { value };
      if (!isNullOrUndefined(viewModel) && viewModel.arrayType === ArrayType.COMPLEX) {
        propertiesToUpdate.value = viewModel.uncastedValue;
      }

      console.log('Mock Update Triggered:', {
        nodeName,
        actionResult: mocks.actionResult,
        id,
        value: propertiesToUpdate.value,
        type,
      });

      if (mocks.actionResult === ActionResults.FAILED) {
        console.log('Dispatching updateMockFailure');
        dispatch(
          updateMockFailure({
            operationName: nodeName,
            outputs: propertiesToUpdate.value ?? [],
            outputId: id,
            completed: true,
            type: type,
            errorMessage,
            errorCode,
          })
        );
      } else {
        console.log('Dispatching updateMockSuccess');
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
    [nodeName, dispatch, errorMessage, errorCode, mocks.actionResult]
  );

  const onActionResultUpdate = useCallback(
    (newState: ActionResultUpdateEvent): void => {
      console.log('Action Result Update Triggered:', newState);
      if (newState.actionResult === ActionResults.FAILED) {
        console.log('Setting action result to FAILED');
        dispatch(
          updateActionResultFailure({
            operationName: nodeName,
            actionResult: newState.actionResult,
            completed: true,
            errorMessage,
            errorCode,
          })
        );
      } else {
        console.log('Setting action result to SUCCESS');
        dispatch(
          updateActionResultSuccess({
            operationName: nodeName,
            actionResult: newState.actionResult,
            completed: true,
          })
        );
      }
    },
    [nodeName, dispatch, errorMessage, errorCode]
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
      onValueChange: (newState: ChangeState) => {
        console.log('Value Change Detected for ID:', id, 'New State:', newState);
        onMockUpdate(id, newState, type);
      },
    };
  });

  return (
    <OutputMocks
      isMockSupported={isMockSupported}
      nodeId={nodeId}
      onActionResultUpdate={onActionResultUpdate}
      outputs={outputs}
      mocks={mocks}
      errorMessage={errorMessage}
      onErrorMessageChange={setErrorMessage}
      errorCode={errorCode}
      onErrorCodeChange={setErrorCode}
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
