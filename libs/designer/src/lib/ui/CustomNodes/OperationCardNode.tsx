import { getMonitoringError } from '../../common/utilities/error';
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
  useSecureInputsOutputs,
  useParameterStaticResult,
  useParameterValidationErrors,
  useTokenDependencies,
  useOperationVisuals,
  useIsNodeLoadingDynamicData,
} from '../../core/state/operation/operationSelector';
import { useIsNodePinnedToOperationPanel, useIsNodeSelectedInOperationPanel } from '../../core/state/panel/panelSelectors';
import { changePanelNode, setSelectedNodeId } from '../../core/state/panel/panelSlice';
import {
  useAllOperations,
  useConnectorName,
  useIsConnectionRequired,
  useNodeConnectionName,
  useOperationInfo,
  useOperationQuery,
} from '../../core/state/selectors/actionMetadataSelector';
import { useSettingValidationErrors } from '../../core/state/setting/settingSelector';
import { useIsMockSupported, useMocksByOperation } from '../../core/state/unitTest/unitTestSelectors';
import {
  useNodeDescription,
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
} from '../../core/state/workflow/workflowSelectors';
import { useIsA2AWorkflow } from '../../core/state/designerView/designerViewSelectors';
import { setRepetitionRunData } from '../../core/state/workflow/workflowSlice';
import { getRepetitionName } from '../common/LoopsPager/helper';
import { DropZone } from '../connections/dropzone';
import { MessageBarType } from '@fluentui/react';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { isNullOrUndefined, useNodeIndex } from '@microsoft/logic-apps-shared';
import { Card } from '@microsoft/designer-ui';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useDrag } from 'react-dnd';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import type { NodeProps } from '@xyflow/react';
import { useHotkeys } from 'react-hotkeys-hook';
import { CopyTooltip } from '../common/DesignerContextualMenu/CopyTooltip';
import { EdgeDrawSourceHandle } from './handles/EdgeDrawSourceHandle';
import { EdgeDrawTargetHandle } from './handles/EdgeDrawTargetHandle';

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
  const isTrigger = useMemo(() => metadata?.graphId === 'root' && metadata?.isRoot, [metadata]);
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
  const isSecureInputsOutputs = useSecureInputsOutputs(id);
  const isLoadingDynamicData = useIsNodeLoadingDynamicData(id);

  const suppressDefaultNodeSelect = useSuppressDefaultNodeSelectFunctionality();
  const nodeSelectCallbackOverride = useNodeSelectAdditionalCallback();
  const graphId = metadata?.graphId ?? '';
  const isWithinAgenticLoop = useIsWithinAgenticLoop(graphId);
  const selfRunData = useRunData(id);
  const parentSubgraphRunData = useSubgraphRunData(parentNodeId ?? '');
  const toolRunIndex = useRunIndex(graphId);
  const isA2AWorkflow = useIsA2AWorkflow();

  const { isFetching: isRepetitionFetching, data: repetitionRunData } = useNodeRepetition(
    !!isMonitoringView,
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

  useEffect(() => {
    if (isWithinAgenticLoop && !isNullOrUndefined(toolRunIndex)) {
      const subgraphRunData = parentSubgraphRunData?.[id]?.actionResults?.[toolRunIndex];
      if (subgraphRunData) {
        dispatch(
          setRepetitionRunData({
            nodeId: id,
            runData: subgraphRunData as LogicAppsV2.WorkflowRunAction,
            isWithinAgentic: isWithinAgenticLoop,
          })
        );
      }
    }
  }, [isWithinAgenticLoop, id, dispatch, toolRunIndex, parentSubgraphRunData]);

  const { dependencies, loopSources } = useTokenDependencies(id);

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
      canDrag: !readOnly && !isTrigger,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [readOnly, metadata, dependencies]
  );

  const selected = useIsNodeSelectedInOperationPanel(id);
  const isPinned = useIsNodePinnedToOperationPanel(id);
  const nodeComment = useNodeDescription(id);
  const connectionResult = useNodeConnectionName(id);
  const isConnectionRequired = useIsConnectionRequired(operationInfo);
  const isLeaf = useIsLeafNode(id);
  const label = useNodeDisplayName(id);

  const showLeafComponents = useMemo(() => !readOnly && isLeaf, [readOnly, isLeaf]);

  const { brandColor, iconUri } = useOperationVisuals(id);

  const comment = useMemo(
    () =>
      nodeComment
        ? {
            brandColor,
            comment: nodeComment,
            isDismissed: false,
            isEditing: false,
          }
        : undefined,
    [brandColor, nodeComment]
  );

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

  const { errorMessage, errorLevel } = useMemo(() => {
    if (errorInfo && errorInfo.level !== ErrorLevel.DynamicOutputs) {
      const { message, level } = errorInfo;
      return {
        errorMessage: message,
        errorLevel:
          level !== ErrorLevel.Default && level !== ErrorLevel.DynamicInputs ? MessageBarType.error : MessageBarType.severeWarning,
      };
    }

    if (isOperationQueryError) {
      return { errorMessage: opManifestErrorText, errorLevel: MessageBarType.error };
    }

    if (settingValidationErrors?.length > 0) {
      return { errorMessage: settingValidationErrorText, errorLevel: MessageBarType.severeWarning };
    }

    if (parameterValidationErrors?.length > 0) {
      return { errorMessage: parameterValidationErrorText, errorLevel: MessageBarType.severeWarning };
    }

    if (flowErrors?.length > 0) {
      return { errorMessage: flowErrorText, errorLevel: MessageBarType.severeWarning };
    }

    if (isMonitoringView) {
      const { status: statusRun, error: errorRun, code: codeRun } = selfRunData ?? {};
      return getMonitoringError(errorRun, statusRun, codeRun);
    }

    return { errorMessage: undefined, errorLevel: undefined };
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
    isMonitoringView,
    selfRunData,
  ]);

  const shouldFocus = useShouldNodeFocus(id);
  const staticResults = useParameterStaticResult(id);

  const nodeIndex = useNodeIndex(id);
  const isCardActive = isMonitoringView ? !isNullOrUndefined(selfRunData?.status) : true;

  return (
    <>
      <div className="nopan" ref={ref as any}>
        <EdgeDrawTargetHandle />
        <Card
          active={isCardActive}
          showStatusPill={isMonitoringView && isCardActive}
          title={label}
          icon={iconUri}
          draggable={!readOnly && !isTrigger}
          brandColor={brandColor}
          id={id}
          connectionRequired={isConnectionRequired}
          connectionDisplayName={connectionResult.isLoading ? '...' : connectionResult.result}
          connectorName={connectorName?.result}
          commentBox={comment}
          drag={drag}
          dragPreview={dragPreview}
          errorMessage={errorMessage}
          errorLevel={errorLevel}
          isDragging={isDragging}
          isLoading={isLoading}
          isUnitTest={isUnitTest}
          nodeMockResults={nodeMockResults}
          isMockSupported={isMockSupported}
          runData={selfRunData}
          readOnly={readOnly}
          onClick={nodeClick}
          onContextMenu={onContextMenu}
          onDeleteClick={deleteClick}
          onCopyClick={copyClick}
          selectionMode={selected ? 'selected' : isPinned ? 'pinned' : false}
          setFocus={shouldFocus}
          staticResultsEnabled={!!staticResults && staticResults.staticResultOptions === StaticResultOption.ENABLED}
          isSecureInputsOutputs={isSecureInputsOutputs}
          isLoadingDynamicData={isLoadingDynamicData}
          nodeIndex={nodeIndex}
          subtleBackground={isA2AWorkflow && isTrigger}
        />
        {showCopyCallout ? <CopyTooltip id={id} targetRef={ref} hideTooltip={clearCopyTooltip} /> : null}
        <EdgeDrawSourceHandle />
      </div>
      {showLeafComponents ? (
        <div className={'edge-drop-zone-container'}>
          <DropZone graphId={metadata?.graphId ?? ''} parentId={id} isLeaf={isLeaf} tabIndex={nodeIndex} />
        </div>
      ) : null}
    </>
  );
};

DefaultNode.displayName = 'DefaultNode';

export default memo(DefaultNode);
