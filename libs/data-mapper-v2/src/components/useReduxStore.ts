import { emptyCanvasRect } from '@microsoft/logic-apps-shared';
import type { RootState } from '../core/state/Store';
import { shallowEqual, useSelector } from 'react-redux';
import { WarningModalState } from '../core/state/ModalSlice';

const useReduxStore = (): any => {
  // boolean or generic types
  const isDirty = useSelector((state: RootState) => state.dataMap.present.isDirty);
  const sourceInEditState = useSelector((state: RootState) => state.dataMap.present.sourceInEditState);
  const targetInEditState = useSelector((state: RootState) => state.dataMap.present.targetInEditState);
  const isCodeViewOpen = useSelector((state: RootState) => state.panel.codeViewPanel.isOpen);
  const xsltFilename = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.xsltFilename);
  const xsltContent = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.xsltContent);
  const selectedItemKey = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemKey);
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
  const past = useSelector((state: RootState) => state.dataMap.past, shallowEqual);
  const currentConnections = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections, shallowEqual);
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
  const targetSchemaSortArray = useSelector(
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

  return {
    isDirty,
    sourceInEditState,
    targetInEditState,
    isCodeViewOpen,
    xsltFilename,
    xsltContent,
    selectedItemKey,
    edgePopOverId,
    isDiscardConfirmed,
    past,
    currentConnections,
    sourceSchema,
    targetSchema,
    functionNodes,
    flattenedSourceSchema,
    flattenedTargetSchema,
    targetSchemaSortArray,
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
    testMapInput,
    isTestPanelOpen,
    testMapOutput,
    testMapOutputError,
    isFunctionPanelOpen,
  };
};

export default useReduxStore;
