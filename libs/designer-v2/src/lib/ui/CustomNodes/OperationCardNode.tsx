import Constants from '../../common/constants';
import { useNodeRepetition, type AppDispatch } from '../../core';
import { copyOperation } from '../../core/actions/bjsworkflow/copypaste';
import { moveOperation } from '../../core/actions/bjsworkflow/move';
import { StaticResultOption } from '../../core/actions/bjsworkflow/staticresults';
import {
  useMonitoringView,
  useNodeSelectAdditionalCallback,
  useReadOnly,
  useSuppressDefaultNodeSelectFunctionality,
  useUnitTest,
} from '../../core/state/designerOptions/designerOptionsSelectors';
import { setNodeContextMenuData, setShowDeleteModalNodeId } from '../../core/state/designerView/designerViewSlice';
import { ErrorLevel } from '../../core/state/operation/operationMetadataSlice';
import {
  useOperationErrorInfo,
  useParameterStaticResult,
  useParameterValidationErrors,
  useTokenDependencies,
  useOperationVisuals,
  useIsNodeLoadingDynamicData,
} from '../../core/state/operation/operationSelector';
import { useIsNodeSelectedInOperationPanel } from '../../core/state/panel/panelSelectors';
import { changePanelNode, setSelectedNodeId } from '../../core/state/panel/panelSlice';
import { useAllOperations, useConnectorName, useOperationInfo, useOperationQuery } from '../../core/state/selectors/actionMetadataSelector';
import { useSettingValidationErrors } from '../../core/state/setting/settingSelector';
import { useIsMockSupported, useMocksByOperation } from '../../core/state/unitTest/unitTestSelectors';
import {
  useNodeDisplayName,
  useNodeMetadata,
  useNodesMetadata,
  useRunData,
  useParentRunIndex,
  useRunInstance,
  useShouldNodeFocus,
  useParentNodeId,
  useIsLeafNode,
  useIsWithinAgenticLoop,
  useSubgraphRunData,
  useRunIndex,
  useFlowErrorsForNode,
  useToolRunIndex,
  useActionMetadata,
} from '../../core/state/workflow/workflowSelectors';
import { useIsA2AWorkflow } from '../../core/state/designerView/designerViewSelectors';
import { setRepetitionRunData } from '../../core/state/workflow/workflowSlice';
import { getRepetitionName } from '../common/LoopsPager/helper';
import { LoopsPager } from '../common/LoopsPager/LoopsPager';
import { DropZone } from '../connections/dropzone';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { isNullOrUndefined, SUBGRAPH_TYPES, useNodeIndex } from '@microsoft/logic-apps-shared';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useDrag } from 'react-dnd';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import type { NodeProps } from '@xyflow/react';
import { useHotkeys } from 'react-hotkeys-hook';
import { CopyTooltip } from '../common/DesignerContextualMenu/CopyTooltip';
import { EdgeDrawSourceHandle } from './components/handles/EdgeDrawSourceHandle';
import { EdgeDrawTargetHandle } from './components/handles/EdgeDrawTargetHandle';
import { ActionCard } from './components/card';

const DefaultNode = ({ id }: NodeProps) => {
  const readOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();
  const isUnitTest = useUnitTest();

  const intl = useIntl();

  const dispatch = useDispatch<AppDispatch>();
  const operationsInfo = useAllOperations();
  const errorInfo = useOperationErrorInfo(id);
  const metadata = useNodeMetadata(id);
  const operationInfo = useOperationInfo(id);
  const connectorName = useConnectorName(operationInfo);
  const isTrigger = useMemo(() => metadata?.isTrigger ?? false, [metadata]);
  const parentRunIndex = useParentRunIndex(id);
  const runInstance = useRunInstance();
  const parentNodeId = useParentNodeId(id);
  const parentRunData = useRunData(parentNodeId ?? '');
  const nodeMockResults = useMocksByOperation(isTrigger ? `&${id}` : id);
  const isMockSupported = useIsMockSupported(id, isTrigger ?? false);
  const nodesMetaData = useNodesMetadata();
  const repetitionName = useMemo(
    () => getRepetitionName(parentRunIndex, id, nodesMetaData, operationsInfo),
    [id, nodesMetaData, operationsInfo, parentRunIndex]
  );
  const isLoadingDynamicData = useIsNodeLoadingDynamicData(id);

  const suppressDefaultNodeSelect = useSuppressDefaultNodeSelectFunctionality();
  const nodeSelectCallbackOverride = useNodeSelectAdditionalCallback();
  const graphId = metadata?.graphId ?? '';
  const isWithinAgenticLoop = useIsWithinAgenticLoop(graphId);
  const selfRunData = useRunData(id);
  const parentSubgraphRunData = useSubgraphRunData(parentNodeId ?? '');
  const toolRunIndex = useRunIndex(graphId);
  const mcpToolRunIndex = useToolRunIndex(id);
  const isA2AWorkflow = useIsA2AWorkflow();

  const { isFetching: isRepetitionFetching, data: repetitionRunData } = useNodeRepetition(
    !!isMonitoringView && !!runInstance,
    id,
    runInstance?.id,
    repetitionName,
    parentRunData?.status,
    parentRunIndex,
    isWithinAgenticLoop
  );

  useEffect(() => {
    if (!isNullOrUndefined(repetitionRunData)) {
      if (selfRunData?.correlation?.actionTrackingId === repetitionRunData?.properties?.correlation?.actionTrackingId) {
        // if the correlation id is the same, we don't need to update the repetition run data
        return;
      }
      dispatch(setRepetitionRunData({ nodeId: id, runData: repetitionRunData.properties as LogicAppsV2.WorkflowRunAction }));
    }
  }, [dispatch, repetitionRunData, id, selfRunData?.correlation?.actionTrackingId]);

  const parentActionMetadata = useActionMetadata(parentNodeId);

  const actualToolRunIndex = useMemo(
    () => (metadata?.subgraphType === SUBGRAPH_TYPES.MCP_CLIENT ? mcpToolRunIndex : toolRunIndex),
    [metadata, toolRunIndex, mcpToolRunIndex]
  );

  useEffect(() => {
    if (isWithinAgenticLoop && !isNullOrUndefined(actualToolRunIndex)) {
      const subgraphRunData = parentSubgraphRunData?.[id]?.actionResults?.[actualToolRunIndex];
      if (subgraphRunData) {
        dispatch(
          setRepetitionRunData({
            nodeId: id,
            runData: subgraphRunData as LogicAppsV2.WorkflowRunAction,
          })
        );
      }
    }
  }, [isWithinAgenticLoop, id, dispatch, actualToolRunIndex, parentSubgraphRunData]);

  const shouldShowPager = useMemo(() => {
    const isParentAgent = parentActionMetadata?.type?.toLowerCase() === Constants.NODE.TYPE.AGENT;
    const isMcpClient = metadata?.subgraphType === SUBGRAPH_TYPES.MCP_CLIENT;
    return isMonitoringView && isParentAgent && isMcpClient && (metadata?.toolRunData?.repetitionCount ?? 0) > 1;
  }, [metadata?.toolRunData?.repetitionCount, metadata?.subgraphType, parentActionMetadata?.type, isMonitoringView]);

  const { dependencies, loopSources } = useTokenDependencies(id);

  // Check if this is an MCP client node (either by subgraph type or operation type)
  const isMcpClient = useMemo(() => {
    return (
      metadata?.subgraphType === SUBGRAPH_TYPES.MCP_CLIENT ||
      operationInfo?.type?.toLowerCase() === 'mcpclienttool' ||
      operationInfo?.operationId === 'nativemcpclient'
    );
  }, [metadata?.subgraphType, operationInfo?.type, operationInfo?.operationId]);

  const [{ isDragging }, drag, dragPreview] = useDrag(
    () => ({
      type: 'BOX',
      end: (item, monitor) => {
        const dropResult = monitor.getDropResult<{
          graphId: string;
          parentId: string;
          childId: string;
        }>();
        if (item && dropResult) {
          dispatch(
            moveOperation({
              nodeId: id,
              oldGraphId: metadata?.graphId ?? 'root',
              newGraphId: dropResult.graphId,
              relationshipIds: dropResult,
            })
          );
        }
      },
      item: {
        id: id,
        dependencies,
        loopSources,
        graphId: metadata?.graphId,
      },
      canDrag: !readOnly && !isTrigger && !isMcpClient,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [readOnly, metadata, dependencies]
  );

  const isSelected = useIsNodeSelectedInOperationPanel(id);
  const isLeaf = useIsLeafNode(id);
  const label = useNodeDisplayName(id);

  const showLeafComponents = useMemo(() => !readOnly && isLeaf && !isMcpClient, [readOnly, isLeaf, isMcpClient]);

  const { iconUri } = useOperationVisuals(id);

  const handleNodeSelection = useCallback(() => {
    if (nodeSelectCallbackOverride) {
      nodeSelectCallbackOverride(id);
    }
    if (suppressDefaultNodeSelect) {
      dispatch(setSelectedNodeId(id));
    } else {
      dispatch(changePanelNode(id));
    }
  }, [dispatch, id, nodeSelectCallbackOverride, suppressDefaultNodeSelect]);

  const nodeClick = useCallback(() => {
    handleNodeSelection();
  }, [handleNodeSelection]);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dispatch(
        setNodeContextMenuData({
          nodeId: id,
          location: {
            x: e.clientX,
            y: e.clientY,
          },
        })
      );
    },
    [dispatch, id]
  );

  const deleteClick = useCallback(() => {
    dispatch(setShowDeleteModalNodeId(id));
  }, [dispatch, id]);

  const [showCopyCallout, setShowCopyCallout] = useState(false);
  const copyClick = useCallback(() => {
    setShowCopyCallout(true);
    dispatch(copyOperation({ nodeId: id }));
    setCopyCalloutTimeout(setTimeout(() => setShowCopyCallout(false), 3000));
  }, [dispatch, id]);

  const [copyCalloutTimeout, setCopyCalloutTimeout] = useState<NodeJS.Timeout>();
  const clearCopyTooltip = useCallback(() => {
    copyCalloutTimeout && clearTimeout(copyCalloutTimeout);
    setShowCopyCallout(false);
  }, [copyCalloutTimeout]);

  const ref = useHotkeys(['meta+c', 'ctrl+c'], copyClick, { preventDefault: true });

  const { isFetching: isOperationQueryLoading, isError: isOperationQueryError } = useOperationQuery(id);

  const isLoading = useMemo(() => isRepetitionFetching || isOperationQueryLoading, [isRepetitionFetching, isOperationQueryLoading]);

  const opManifestErrorText = intl.formatMessage({
    defaultMessage: 'Error fetching manifest',
    id: 'HmcHoE',
    description: 'Error message when manifest fails to load',
  });

  const settingValidationErrors = useSettingValidationErrors(id);
  const settingValidationErrorText = intl.formatMessage({
    defaultMessage: 'Invalid settings',
    id: 'Jil/Wa',
    description: 'Text to explain that there are invalid settings for this node',
  });

  const parameterValidationErrors = useParameterValidationErrors(id);
  const parameterValidationErrorText = intl.formatMessage({
    defaultMessage: 'Invalid parameters',
    id: 'Tmr/9e',
    description: 'Text to explain that there are invalid parameters for this node',
  });

  const flowErrors = useFlowErrorsForNode(id);
  const flowErrorText = intl.formatMessage({
    defaultMessage: 'Action unreachable',
    id: 'PoPO/T',
    description: 'Text to explain that there are flow structure errors for this node',
  });

  const { errorMessages } = useMemo(() => {
    const allMessages: string[] = [];

    if (errorInfo && errorInfo.level !== ErrorLevel.DynamicOutputs) {
      const { message } = errorInfo;
      allMessages.push(message);
    }

    if (isOperationQueryError) {
      allMessages.push(opManifestErrorText);
    }

    if (settingValidationErrors?.length > 0) {
      allMessages.push(settingValidationErrorText);
    }

    if (parameterValidationErrors?.length > 0) {
      allMessages.push(parameterValidationErrorText);
    }

    if (flowErrors?.length > 0) {
      allMessages.push(flowErrorText);
    }

    return { errorMessages: allMessages };
  }, [
    errorInfo,
    isOperationQueryError,
    settingValidationErrors?.length,
    parameterValidationErrors?.length,
    flowErrors?.length,
    opManifestErrorText,
    settingValidationErrorText,
    parameterValidationErrorText,
    flowErrorText,
  ]);

  const shouldFocus = useShouldNodeFocus(id);
  const staticResults = useParameterStaticResult(id);

  const nodeIndex = useNodeIndex(id);
  const isCardActive = isMonitoringView ? !isNullOrUndefined(selfRunData?.status) : true;

  return (
    <>
      <div className="nopan" ref={ref as any}>
        <EdgeDrawTargetHandle />
        <ActionCard
          id={id}
          active={isCardActive}
          title={label}
          icon={iconUri}
          connectorName={connectorName?.result}
          drag={drag}
          dragPreview={dragPreview}
          errorMessages={errorMessages}
          isDragging={isDragging}
          isLoading={isLoading}
          isSelected={isSelected}
          isUnitTest={isUnitTest}
          nodeMockResults={nodeMockResults}
          isMockSupported={isMockSupported}
          runData={selfRunData}
          readOnly={readOnly}
          onClick={nodeClick}
          onContextMenu={onContextMenu}
          onDeleteClick={deleteClick}
          onCopyClick={copyClick}
          setFocus={shouldFocus}
          staticResultsEnabled={!!staticResults && staticResults.staticResultOptions === StaticResultOption.ENABLED}
          isLoadingDynamicData={isLoadingDynamicData}
          nodeIndex={nodeIndex}
          subtleBackground={isA2AWorkflow && isTrigger}
        />
        {showCopyCallout ? <CopyTooltip id={id} targetRef={ref} hideTooltip={clearCopyTooltip} /> : null}
        {!isMcpClient && <EdgeDrawSourceHandle />}
      </div>
      {showLeafComponents ? (
        <div className={'edge-drop-zone-container'}>
          <DropZone graphId={metadata?.graphId ?? ''} parentId={id} isLeaf={isLeaf} tabIndex={nodeIndex} />
        </div>
      ) : null}
      {shouldShowPager ? <LoopsPager metadata={metadata} scopeId={id} collapsed={false} useToolRun={true} /> : null}
    </>
  );
};

DefaultNode.displayName = 'DefaultNode';

export default memo(DefaultNode);
