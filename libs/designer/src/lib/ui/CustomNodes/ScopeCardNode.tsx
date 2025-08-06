import constants from '../../common/constants';
import { getMonitoringError } from '../../common/utilities/error';
import { moveOperation } from '../../core/actions/bjsworkflow/move';
import { useMonitoringView, useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { setNodeContextMenuData, setShowDeleteModalNodeId } from '../../core/state/designerView/designerViewSlice';
import {
  useBrandColor,
  useIconUri,
  useParameterValidationErrors,
  useTokenDependencies,
} from '../../core/state/operation/operationSelector';
import { useIsNodePinnedToOperationPanel, useIsNodeSelectedInOperationPanel } from '../../core/state/panel/panelSelectors';
import { changePanelNode } from '../../core/state/panel/panelSlice';
import { useAllOperations, useOperationQuery } from '../../core/state/selectors/actionMetadataSelector';
import { useSettingValidationErrors } from '../../core/state/setting/settingSelector';
import {
  useActionMetadata,
  useIsGraphCollapsed,
  useIsLeafNode,
  useNodeDisplayName,
  useNodeMetadata,
  useNodesMetadata,
  useRunData,
  useParentRunIndex,
  useRunInstance,
  useParentNodeId,
  useNodeDescription,
  useShouldNodeFocus,
  useRunIndex,
  useActionTimelineRepetitionCount,
  useTimelineRepetitionIndex,
  useIsActionInSelectedTimelineRepetition,
  useHandoffActionsForAgent,
  useFlowErrorsForNode,
} from '../../core/state/workflow/workflowSelectors';
import {
  setFocusElement,
  setRepetitionRunData,
  setSubgraphRunData,
  toggleCollapsedGraphId,
  updateAgenticGraph,
  updateAgenticMetadata,
} from '../../core/state/workflow/workflowSlice';
import type { AppDispatch } from '../../core/store';
import { LoopsPager } from '../common/LoopsPager/LoopsPager';
import { getRepetitionName, getScopeRepetitionName } from '../common/LoopsPager/helper';
import { DropZone } from '../connections/dropzone';
import { MessageBarType } from '@fluentui/react';
import { equals, isNullOrUndefined, removeIdTag, useNodeIndex } from '@microsoft/logic-apps-shared';
import { ScopeCard } from '@microsoft/designer-ui';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDrag } from 'react-dnd';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import type { NodeProps } from '@xyflow/react';
import { copyScopeOperation } from '../../core/actions/bjsworkflow/copypaste';
import { useHotkeys } from 'react-hotkeys-hook';
import { CopyTooltip } from '../common/DesignerContextualMenu/CopyTooltip';
import { useNodeRepetition, useAgentRepetition, useAgentActionsRepetition } from '../../core/queries/runs';
import { EdgeDrawTargetHandle } from './handles/EdgeDrawTargetHandle';
import { DefaultHandle } from './handles/DefaultHandle';
import { EdgeDrawSourceHandle } from './handles/EdgeDrawSourceHandle';
import { useIsA2AWorkflow } from '../../core/state/designerView/designerViewSelectors';

const ScopeCardNode = ({ id }: NodeProps) => {
  const scopeId = useMemo(() => removeIdTag(id), [id]);
  const nodeComment = useNodeDescription(scopeId);
  const shouldFocus = useShouldNodeFocus(scopeId);
  const node = useActionMetadata(scopeId);
  const operationsInfo = useAllOperations();

  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const readOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();

  const metadata = useNodeMetadata(scopeId);
  const parentRunIndex = useParentRunIndex(scopeId);
  const runInstance = useRunInstance();
  const runData = useRunData(scopeId);
  const parentNodeId = useParentNodeId(scopeId);
  const parentRunData = useRunData(parentNodeId ?? '');
  const selfRunData = useRunData(scopeId);
  const nodesMetaData = useNodesMetadata();
  const isPinned = useIsNodePinnedToOperationPanel(scopeId);
  const selected = useIsNodeSelectedInOperationPanel(scopeId);
  const brandColor = useBrandColor(scopeId);
  const iconUri = useIconUri(scopeId);
  const isLeaf = useIsLeafNode(id);
  const label = useNodeDisplayName(scopeId);
  const normalizedType = node?.type.toLowerCase();
  const isAgent = normalizedType === constants.NODE.TYPE.AGENT;
  const runIndex = useRunIndex(scopeId);
  const scopeRepetitionName = useMemo(() => getScopeRepetitionName(runIndex), [runIndex]);
  const isTimelineRepetitionSelected = useIsActionInSelectedTimelineRepetition(scopeId);
  const isA2AWorkflow = useIsA2AWorkflow();
  const timelineRepetitionIndex = useTimelineRepetitionIndex();
  const timelineRepetitionCount = useActionTimelineRepetitionCount(scopeId, timelineRepetitionIndex);
  const repetitionName = useMemo(
    () => getRepetitionName(parentRunIndex, scopeId, nodesMetaData, operationsInfo),
    [nodesMetaData, operationsInfo, parentRunIndex, scopeId]
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { isFetching: isRepetitionFetching, data: repetitionRunData } = useNodeRepetition(
    !!isMonitoringView,
    scopeId,
    runInstance?.id,
    repetitionName,
    parentRunData?.status,
    parentRunIndex,
    false
  );

  const { isFetching: isAgentRepetitionFetching, data: agentRepetitionRunData } = useAgentRepetition(
    !!isMonitoringView && runIndex !== undefined && isAgent && !isA2AWorkflow,
    isAgent,
    scopeId,
    isTimelineRepetitionSelected ? runInstance?.id : undefined,
    scopeRepetitionName,
    parentRunData?.status,
    runIndex
  );

  const { isFetching: isAgentActionsRepetitionFetching, data: agentActionsRepetitionData } = useAgentActionsRepetition(
    !!isMonitoringView && runIndex !== undefined && isAgent,
    scopeId,
    runInstance?.id,
    scopeRepetitionName,
    parentRunData?.status,
    runIndex
  );

  useEffect(() => {
    if (isNullOrUndefined(agentActionsRepetitionData)) {
      return;
    }
    const updatePayload = { nodeId: scopeId, runData: agentActionsRepetitionData as LogicAppsV2.RunRepetition[] };
    dispatch(setSubgraphRunData(updatePayload));
  }, [dispatch, agentRepetitionRunData, scopeId, agentActionsRepetitionData, isMonitoringView]);

  useEffect(() => {
    if (isMonitoringView && !isTimelineRepetitionSelected) {
      return;
    }
    if (isNullOrUndefined(agentRepetitionRunData)) {
      return;
    }
    const [_, existingMetadata] = Object.entries(nodesMetaData).find(([id, _]) => id === scopeId) ?? ['', {}];
    if (existingMetadata?.runData?.inputsLink?.uri === agentRepetitionRunData?.properties?.inputsLink?.uri) {
      // if the inputsLink uri is the same, we don't need to update the repetition run data
      return;
    }
    const updatePayload = { nodeId: scopeId, scopeRepetitionRunData: agentRepetitionRunData.properties } as any;
    dispatch(updateAgenticGraph(updatePayload));
    dispatch(updateAgenticMetadata(updatePayload));
  }, [
    dispatch,
    agentRepetitionRunData,
    scopeId,
    selfRunData?.correlation?.actionTrackingId,
    isMonitoringView,
    isTimelineRepetitionSelected,
    nodesMetaData,
  ]);

  useEffect(() => {
    if (isMonitoringView && !isTimelineRepetitionSelected) {
      return;
    }
    if (isNullOrUndefined(repetitionRunData)) {
      return;
    }
    if (selfRunData?.correlation?.actionTrackingId === repetitionRunData?.properties?.correlation?.actionTrackingId) {
      // if the correlation id is the same, we don't need to update the repetition run data
      return;
    }
    dispatch(setRepetitionRunData({ nodeId: scopeId, runData: repetitionRunData.properties as LogicAppsV2.WorkflowRunAction }));
  }, [dispatch, repetitionRunData, scopeId, selfRunData?.correlation?.actionTrackingId]);

  const { dependencies, loopSources } = useTokenDependencies(scopeId);
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
              nodeId: scopeId,
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
        isScope: true,
        isAgent: isAgent,
      },
      canDrag: !readOnly,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [readOnly, metadata]
  );

  const nodeClick = useCallback(() => {
    dispatch(changePanelNode(scopeId));
  }, [dispatch, scopeId]);

  const graphCollapsed = useIsGraphCollapsed(scopeId);
  const handleGraphCollapse = useCallback(
    (includeNested?: boolean) => {
      dispatch(toggleCollapsedGraphId({ id: scopeId, includeNested }));
    },
    [dispatch, scopeId]
  );

  const deleteClick = useCallback(() => {
    dispatch(setShowDeleteModalNodeId(scopeId));
  }, [dispatch, scopeId]);

  const [showCopyCallout, setShowCopyCallout] = useState(false);
  const copyClick = useCallback(() => {
    setShowCopyCallout(true);
    dispatch(copyScopeOperation({ nodeId: id }));
    setCopyCalloutTimeout(setTimeout(() => setShowCopyCallout(false), 3000));
  }, [dispatch, id]);

  const [copyCalloutTimeout, setCopyCalloutTimeout] = useState<NodeJS.Timeout>();
  const clearCopyCallout = useCallback(() => {
    copyCalloutTimeout && clearTimeout(copyCalloutTimeout);
    setShowCopyCallout(false);
  }, [copyCalloutTimeout]);

  const ref = useHotkeys(['meta+c', 'ctrl+c'], copyClick, { preventDefault: true });

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dispatch(
        setNodeContextMenuData({
          nodeId: scopeId,
          location: {
            x: e.clientX,
            y: e.clientY,
          },
        })
      );
    },
    [dispatch, scopeId]
  );

  const opQuery = useOperationQuery(scopeId);

  const isLoading = useMemo(
    () =>
      isRepetitionFetching ||
      isAgentRepetitionFetching ||
      isAgentActionsRepetitionFetching ||
      opQuery.isLoading ||
      (!brandColor && !iconUri),
    [brandColor, iconUri, opQuery.isLoading, isRepetitionFetching, isAgentRepetitionFetching, isAgentActionsRepetitionFetching]
  );

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

  const handoffActions = useHandoffActionsForAgent(scopeId);
  const actionCount = useMemo(() => {
    const rawCount = metadata?.actionCount ?? 0;
    let hiddenActionCount = 0;
    hiddenActionCount += handoffActions.filter((action) => action.isSingleAction).length;
    return rawCount - hiddenActionCount;
  }, [handoffActions, metadata?.actionCount]);

  const intlText = useMemo(
    () => ({
      opManifestErrorText: intl.formatMessage({
        defaultMessage: 'Error fetching manifest',
        id: 'HmcHoE',
        description: 'Error message when manifest fails to load',
      }),
      settingValidationErrorText: intl.formatMessage({
        defaultMessage: 'Invalid settings',
        id: 'Jil/Wa',
        description: 'Text to explain that there are invalid settings for this node',
      }),
      parameterValidationErrorText: intl.formatMessage({
        defaultMessage: 'Invalid parameters',
        id: 'Tmr/9e',
        description: 'Text to explain that there are invalid parameters for this node',
      }),
      flowErrorText: intl.formatMessage({
        defaultMessage: 'Action unreachable',
        id: 'PoPO/T',
        description: 'Text to explain that there are flow structure errors for this node',
      }),
      actionString: intl.formatMessage(
        {
          defaultMessage: '{actionCount, plural, one {# Action} =0 {0 Actions} other {# Actions}}',
          id: 'B/JzwK',
          description: 'This is the number of actions to be completed in a group',
        },
        { actionCount }
      ),
      caseString: intl.formatMessage(
        {
          defaultMessage: '{actionCount, plural, one {# Case} =0 {0 Cases} other {# Cases}}',
          id: 'KX1poC',
          description: 'This is the number of cases or options the program can take',
        },
        { actionCount }
      ),
      emptyAgent: intl.formatMessage({
        defaultMessage: 'This iteration has completed without any tool execution',
        id: 'w2rxzD',
        description: 'Text to explain that there are no executed tools in the agent iteration',
      }),
      addTool: intl.formatMessage({
        defaultMessage: 'Add tool',
        id: 'Nl4O59',
        description: 'Text that explains no tools exist in this agent',
      }),
      noActions: intl.formatMessage({
        defaultMessage: 'No actions',
        id: 'CN+Jfd',
        description: 'Text to explain that there are no actions',
      }),
    }),
    [actionCount, intl]
  );

  const settingValidationErrors = useSettingValidationErrors(scopeId);
  const parameterValidationErrors = useParameterValidationErrors(scopeId);
  const flowErrors = useFlowErrorsForNode(scopeId);

  const { errorMessage, errorLevel } = useMemo(() => {
    if (opQuery?.isError) {
      return { errorMessage: intlText.opManifestErrorText, errorLevel: MessageBarType.error };
    }
    if (settingValidationErrors?.length > 0) {
      return { errorMessage: intlText.settingValidationErrorText, errorLevel: MessageBarType.severeWarning };
    }
    if (parameterValidationErrors?.length > 0) {
      return { errorMessage: intlText.parameterValidationErrorText, errorLevel: MessageBarType.severeWarning };
    }
    if (flowErrors?.length > 0) {
      return { errorMessage: intlText.flowErrorText, errorLevel: MessageBarType.severeWarning };
    }

    if (isMonitoringView) {
      const { status: statusRun, error: errorRun, code: codeRun } = runData ?? {};
      return getMonitoringError(errorRun, statusRun, codeRun);
    }

    return { errorMessage: undefined, errorLevel: undefined };
  }, [
    opQuery?.isError,
    intlText,
    settingValidationErrors?.length,
    parameterValidationErrors?.length,
    flowErrors?.length,
    isMonitoringView,
    runData,
  ]);

  const renderLoopsPager = useMemo(() => {
    if (!Array.isArray(metadata?.runData) && metadata?.runData?.status && !equals(metadata.runData.status, 'InProgress')) {
      const focusElement = (index: number, id: string) => {
        dispatch(setFocusElement(`${id}-${index}-0`));
      };
      return <LoopsPager metadata={metadata} scopeId={scopeId} collapsed={graphCollapsed} focusElement={focusElement} />;
    }
    return null;
  }, [dispatch, graphCollapsed, metadata, scopeId]);

  const nodeIndex = useNodeIndex(id);

  if (!node) {
    return null;
  }

  const collapsedText =
    normalizedType === constants.NODE.TYPE.SWITCH || normalizedType === constants.NODE.TYPE.IF || isAgent
      ? intlText.caseString
      : intlText.actionString;

  const isFooter = id.endsWith('#footer');
  const showEmptyGraphComponents = isLeaf && !graphCollapsed && !isFooter && !isAgent;

  const shouldShowPager = (normalizedType === constants.NODE.TYPE.FOREACH || isAgent) && isMonitoringView;
  const isCardActive = isMonitoringView ? !isNullOrUndefined(runData?.status) : true;

  return (
    <>
      <div className="msla-scope-card nopan" ref={ref as any}>
        <div ref={rootRef}>
          <EdgeDrawTargetHandle />
          <ScopeCard
            active={isCardActive}
            showStatusPill={!isAgent && isMonitoringView && isCardActive}
            timelineRepetitionCount={timelineRepetitionCount}
            brandColor={brandColor}
            icon={iconUri}
            isLoading={isLoading}
            collapsed={graphCollapsed}
            handleCollapse={handleGraphCollapse}
            drag={drag}
            draggable={!readOnly}
            dragPreview={dragPreview}
            errorLevel={errorLevel}
            errorMessage={errorMessage}
            isDragging={isDragging}
            id={scopeId}
            title={label}
            readOnly={readOnly}
            onClick={nodeClick}
            onContextMenu={onContextMenu}
            onDeleteClick={deleteClick}
            selectionMode={selected ? 'selected' : isPinned ? 'pinned' : false}
            runData={runData}
            commentBox={comment}
            setFocus={shouldFocus}
            nodeIndex={nodeIndex}
          />
          {showCopyCallout ? <CopyTooltip id={scopeId} targetRef={rootRef} hideTooltip={clearCopyCallout} /> : null}
          {shouldShowPager ? renderLoopsPager : null}
          {isFooter ? <EdgeDrawSourceHandle /> : <DefaultHandle type="source" />}
        </div>
      </div>
      {graphCollapsed && !isFooter ? (
        <p className="no-actions-text" data-automation-id={`scope-${id}-no-actions`}>
          {collapsedText}
        </p>
      ) : null}
      {isAgent && actionCount === 0 && !graphCollapsed ? (
        <p className="no-actions-text" style={{ margin: shouldShowPager ? 0 : '1em 0' }} data-automation-id={`scope-${id}-no-tools`}>
          {isMonitoringView ? intlText.emptyAgent : intlText.addTool}
        </p>
      ) : null}
      {showEmptyGraphComponents ? (
        readOnly ? (
          <p className="no-actions-text">{intlText.noActions}</p>
        ) : (
          <div className={'edge-drop-zone-container'}>
            <DropZone graphId={scopeId} parentId={id} isLeaf={isLeaf} tabIndex={nodeIndex} />
          </div>
        )
      ) : null}
    </>
  );
};

ScopeCardNode.displayName = 'ScopeNode';

export default memo(ScopeCardNode);
