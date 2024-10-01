import { emptyCanvasRect } from '@microsoft/logic-apps-shared';
import type { RootState } from '../core/state/Store';
import { shallowEqual, useSelector } from 'react-redux';
import { WarningModalState } from '../core/state/ModalSlice';
import type { DataMapComponentState, DataMapOperationState } from '../core/state/DataMapSlice';
import type { CodeViewState, FunctionPanelState, TestPanelState } from '../core/state/PanelSlice';
import type { Rect } from '@xyflow/react';
import type { FunctionState } from '../core/state/FunctionSlice';

type ReduxStoreState = DataMapOperationState &
  DataMapComponentState &
  FunctionState & {
    test: TestPanelState;
    code: CodeViewState;
    function: FunctionPanelState;
    isDiscardConfirmed: boolean;
    canvasRect: Rect;
  };

const useReduxStore = (): ReduxStoreState => {
  // boolean or generic types
  const isDirty = useSelector((state: RootState) => state.dataMap.present.isDirty);
  const lastAction = useSelector((state: RootState) => state.dataMap.present.lastAction);
  const sourceInEditState = useSelector((state: RootState) => state.dataMap.present.sourceInEditState);
  const targetInEditState = useSelector((state: RootState) => state.dataMap.present.targetInEditState);
  const isCodeViewOpen = useSelector((state: RootState) => state.panel.codeViewPanel.isOpen);
  const xsltFilename = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.xsltFilename);
  const xsltContent = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.xsltContent);
  const selectedItemKey = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemKey);
  const dataMapLML = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapLML);
  const edgePopOverId = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.edgePopOverId);
  const isDiscardConfirmed = useSelector(
    (state: RootState) => state.modal.warningModalType === WarningModalState.DiscardWarning && state.modal.isOkClicked
  );
  const testMapInput = useSelector((state: RootState) => state.panel.testPanel.testMapInput);
  const testMapOutput = useSelector((state: RootState) => state.panel.testPanel.testMapOutput);
  const testMapOutputError = useSelector((state: RootState) => state.panel.testPanel.testMapOutputError);
  const isTestPanelOpen = useSelector((state: RootState) => state.panel.testPanel.isOpen);
  const isFunctionPanelOpen = useSelector((state: RootState) => state.panel.functionPanel.isOpen);

  // array or object
  const dataMapConnections = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections, shallowEqual);
  const sourceSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.sourceSchema, shallowEqual);
  const targetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchema, shallowEqual);
  const functionNodes = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.functionNodes, shallowEqual);
  const flattenedSourceSchema = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.flattenedSourceSchema,
    shallowEqual
  );
  const flattenedTargetSchema = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.flattenedTargetSchema,
    shallowEqual
  );
  const targetSchemaOrdering = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.targetSchemaOrdering,
    shallowEqual
  );
  const sourceOpenKeys = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.sourceOpenKeys, shallowEqual);
  const targetOpenKeys = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetOpenKeys, shallowEqual);
  const selectedItemConnectedNodes = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemConnectedNodes,
    shallowEqual
  );
  const loadedMapMetadata = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.loadedMapMetadata, shallowEqual);
  const inlineFunctionInputOutputKeys = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.inlineFunctionInputOutputKeys,
    shallowEqual
  );
  const edgeLoopMapping = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.edgeLoopMapping, shallowEqual);
  const nodesForScroll = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.nodesForScroll, shallowEqual);
  const handlePosition = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.handlePosition, shallowEqual);
  const schemaTreeData = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.schemaTreeData, shallowEqual);
  const state = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.state, shallowEqual);
  const canvasRect = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation.loadedMapMetadata?.canvasRect ?? emptyCanvasRect,
    shallowEqual
  );
  const availableFunctions = useSelector((state: RootState) => state.function.availableFunctions, shallowEqual);
  const customXsltFilePaths = useSelector((state: RootState) => state.function.customXsltFilePaths, shallowEqual);

  return {
    isDirty,
    sourceInEditState,
    targetInEditState,
    lastAction,
    dataMapLML,
    xsltFilename,
    xsltContent,
    selectedItemKey,
    edgePopOverId,
    isDiscardConfirmed,
    dataMapConnections,
    sourceSchema,
    targetSchema,
    functionNodes,
    flattenedSourceSchema,
    flattenedTargetSchema,
    targetSchemaOrdering,
    sourceOpenKeys,
    targetOpenKeys,
    selectedItemConnectedNodes,
    loadedMapMetadata,
    inlineFunctionInputOutputKeys,
    edgeLoopMapping,
    nodesForScroll,
    handlePosition,
    schemaTreeData,
    state,
    canvasRect,
    availableFunctions,
    customXsltFilePaths,
    code: {
      isOpen: isCodeViewOpen,
    },
    test: {
      isOpen: isTestPanelOpen,
      testMapInput: testMapInput,
      testMapOutput: testMapOutput,
      testMapOutputError: testMapOutputError,
    },
    function: {
      isOpen: isFunctionPanelOpen,
    },
  };
};

export default useReduxStore;
