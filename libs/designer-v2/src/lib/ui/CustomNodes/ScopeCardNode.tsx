import constants from '../../common/constants';
import { moveOperation } from '../../core/actions/bjsworkflow/move';
import { useMonitoringView, useReadOnly, useSharedNodeUi } from '../../core/state/designerOptions/designerOptionsSelectors';
import { setNodeContextMenuData, setShowDeleteModalNodeId } from '../../core/state/designerView/designerViewSlice';
import {
  useBrandColor,
  useIconUri,
  useOperationErrorInfo,
  useParameterValidationErrors,
  useTokenDependencies,
} from '../../core/state/operation/operationSelector';
import {
  useIsNodeSelectedInOperationPanel,
  useIsNodeInMultiSelection,
  useIsNodePinnedToOperationPanel,
} from '../../core/state/panel/panelSelectors';
import { changePanelNode, toggleNodeSelection } from '../../core/state/panel/panelSlice';
import { useAllOperations, useConnectorName, useOperationInfo, useOperationQuery } from '../../core/state/selectors/actionMetadataSelector';
import { useSettingValidationErrors } from '../../core/state/setting/settingSelector';
import {
  useActionMetadata,
  useIsGraphCollapsed,
  useIsLeafNode,
  useNodeDescription,
  useNodeDisplayName,
  useNodeMetadata,
  useRunData,
  useParentRunIndex,
  useRunInstance,
  useParentNodeId,
  useShouldNodeFocus,
  useRunIndex,
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
import { SharedLoopsPager } from '../common/LoopsPager/SharedLoopsPager';
import { getAgentRepetitionIdentity, getScopeRepetitionName, useRepetitionName } from '../common/LoopsPager/helper';
import { DropZone } from '../connections/dropzone';
import { horizontalTerminalStyle } from '../connections/connections.styles';
import {
  SUBGRAPH_TYPES,
  WORKFLOW_NODE_TYPES,
  equals,
  getRecordEntry,
  isNullOrUndefined,
  removeIdTag,
  useNodeIndex,
} from '@microsoft/logic-apps-shared';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDrag } from 'react-dnd';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import type { NodeProps } from '@xyflow/react';
import { copyScopeOperation } from '../../core/actions/bjsworkflow/copypaste';
import { useHotkeys } from 'react-hotkeys-hook';
import { CopyTooltip } from '../common/DesignerContextualMenu/CopyTooltip';
import { useNodeRepetition, useAgentRepetition, useAgentActionsRepetition, useConditionOutputs } from '../../core/queries/runs';
import { EdgeDrawTargetHandle } from './components/handles/EdgeDrawTargetHandle';
import { DefaultHandle } from './components/handles/DefaultHandle';
import { EdgeDrawSourceHandle } from './components/handles/EdgeDrawSourceHandle';
import { useIsA2AWorkflow } from '../../core/state/designerView/designerViewSelectors';
import { ActionCard } from './components/card';
import { ErrorLevel } from '../../core/state/operation/operationMetadataSlice';
import { SharedAgentScopeCard, SharedScopeCard } from './components/card/SharedFamilyCards';
import type { ComponentProps } from 'react';
import type { NodeFrameCountLabel } from '@microsoft/designer-ui-v2';
import { getNodePresentation, type NodePresentation } from '../../core/utils/graph';
import { getScopeModel } from './components/card/scopeNodePresentation';

type BranchPort = { id: string; subgraphType?: string };

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;

const unwrapBoundValue = (value: unknown): unknown => {
  const record = asRecord(value);
  if (!record || !Object.prototype.hasOwnProperty.call(record, 'value')) {
    return value;
  }
  return record.value;
};

const getExpressionResultFromOutputs = (outputs: unknown): unknown => {
  const outputRecord = asRecord(outputs);
  if (!outputRecord) {
    return undefined;
  }
  const direct = unwrapBoundValue(outputRecord.expressionResult);
  if (!isNullOrUndefined(direct)) {
    return direct;
  }
  const bodyRecord = asRecord(unwrapBoundValue(outputRecord.body));
  if (!bodyRecord) {
    return undefined;
  }
  return unwrapBoundValue(bodyRecord.expressionResult);
};

const getIfTakenOutput = (expressionResult: unknown, branchPorts: readonly BranchPort[]): number | undefined => {
  const normalized =
    typeof expressionResult === 'boolean'
      ? expressionResult
      : typeof expressionResult === 'string'
        ? expressionResult.trim().toLowerCase() === 'true'
          ? true
          : expressionResult.trim().toLowerCase() === 'false'
            ? false
            : undefined
        : undefined;
  if (isNullOrUndefined(normalized)) {
    return undefined;
  }
  const expectedType = normalized ? SUBGRAPH_TYPES.CONDITIONAL_TRUE : SUBGRAPH_TYPES.CONDITIONAL_FALSE;
  const index = branchPorts.findIndex((port) => port.subgraphType === expectedType);
  return index >= 0 ? index : undefined;
};

const getSwitchTakenOutput = (
  expressionResult: unknown,
  operation: LogicAppsV2.OperationDefinition | undefined,
  branchPorts: readonly BranchPort[]
): number | undefined => {
  if (!operation || !('cases' in operation) || !operation.cases) {
    return undefined;
  }

  // The result is a value, not a lane ID. Do not select Default from an unmapped value.
  const cases = operation.cases;
  const index = branchPorts.findIndex((port) => Object.is(cases[port.id]?.case, expressionResult));
  return index >= 0 ? index : undefined;
};

const getConditionTakenOutput = (
  operationType: string | undefined,
  expressionResult: unknown,
  operation: LogicAppsV2.OperationDefinition | undefined,
  branchPorts: readonly BranchPort[]
): number | undefined => {
  // Guardrail: only runtime-provided expressionResult is treated as branch evidence for the selected repetition.
  // We intentionally do not infer from downstream skipped/succeeded statuses.
  if (isNullOrUndefined(expressionResult) || branchPorts.length === 0) {
    return undefined;
  }

  if (equals(operationType, constants.NODE.TYPE.IF)) {
    return getIfTakenOutput(expressionResult, branchPorts);
  }
  if (equals(operationType, constants.NODE.TYPE.SWITCH)) {
    return getSwitchTakenOutput(expressionResult, operation, branchPorts);
  }
  return undefined;
};

const ScopeCardNode = ({ id, data }: NodeProps) => {
  const scopeId = useMemo(() => removeIdTag(id), [id]);
  const shouldFocus = useShouldNodeFocus(scopeId, id);
  const node = useActionMetadata(scopeId);
  const errorInfo = useOperationErrorInfo(scopeId);
  const operationsInfo = useAllOperations();

  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const readOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();

  const metadata = useNodeMetadata(scopeId);
  // If metadata always reports 2 (its branches); the shared collapsed count states the branches' actions instead.
  const trueBranchMetadata = useNodeMetadata(`${scopeId}-actions`);
  const falseBranchMetadata = useNodeMetadata(`${scopeId}-elseActions`);
  const operationInfo = useOperationInfo(scopeId);
  const sharedOption = useSharedNodeUi();
  const label = useNodeDisplayName(scopeId);
  const presentation =
    (data?.presentation as NodePresentation | undefined) ??
    getNodePresentation(WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE, sharedOption, { operationType: node?.type, title: label });
  const shared = presentation.shared;
  const connectorName = useConnectorName(operationInfo);
  const parentRunIndex = useParentRunIndex(scopeId);
  const runInstance = useRunInstance();
  const runData = useRunData(scopeId);
  const parentNodeId = useParentNodeId(scopeId);
  const parentRunData = useRunData(parentNodeId ?? '');
  const selfRunData = useRunData(scopeId);
  const selected = useIsNodeSelectedInOperationPanel(scopeId);
  const isMultiSelected = useIsNodeInMultiSelection(scopeId);
  const isPinned = useIsNodePinnedToOperationPanel(scopeId);
  const brandColor = useBrandColor(scopeId);
  const iconUri = useIconUri(scopeId);
  const isLeaf = useIsLeafNode(id);
  const nodeComment = useNodeDescription(scopeId);
  const normalizedType = node?.type.toLowerCase();
  const isAgent = normalizedType === constants.NODE.TYPE.AGENT;
  const isSwitch = normalizedType === constants.NODE.TYPE.SWITCH;
  const isConditional = normalizedType === constants.NODE.TYPE.IF;
  const runIndex = useRunIndex(scopeId);
  const scopeRepetitionName = useMemo(() => getScopeRepetitionName(runIndex), [runIndex]);
  const isTimelineRepetitionSelected = useIsActionInSelectedTimelineRepetition(scopeId);
  const isA2AWorkflow = useIsA2AWorkflow();
  const selectedAgentRunId = isTimelineRepetitionSelected ? runInstance?.id : undefined;
  const agentRepetitionIdentity = useMemo(
    () =>
      getAgentRepetitionIdentity({
        runId: shared && !isA2AWorkflow ? selectedAgentRunId : undefined,
        ownerNodeId: scopeId,
        repetitionName: scopeRepetitionName,
        repetitionIndex: runIndex,
        parentStatus: parentRunData?.status,
      }),
    [shared, isA2AWorkflow, selectedAgentRunId, scopeId, scopeRepetitionName, runIndex, parentRunData?.status]
  );
  const admittedAgentRepetition = useRef<{ identity: string; data: LogicAppsV2.RunRepetition }>();
  const repetitionName = useRepetitionName(parentRunIndex, scopeId, operationsInfo);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { isFetching: isRepetitionFetching, data: repetitionRunData } = useNodeRepetition(
    !!isMonitoringView && !!runInstance,
    scopeId,
    runInstance?.id,
    repetitionName,
    parentRunData?.status,
    parentRunIndex,
    false
  );
  // A nested condition can still have the previous iteration's runData in Redux while the new query loads.
  const usesRepetition = !!runInstance && parentRunIndex !== undefined;
  const showConditionOutcome = !!(shared && !id.endsWith('#footer') && isMonitoringView && (isConditional || isSwitch));
  const outcomeRun = usesRepetition ? (isTimelineRepetitionSelected ? repetitionRunData?.properties : undefined) : runData;
  const inlineResult =
    showConditionOutcome && outcomeRun && 'outputs' in outcomeRun ? getExpressionResultFromOutputs(outcomeRun.outputs) : undefined;
  const linkedOutputs = useConditionOutputs(
    scopeId,
    runInstance?.id,
    repetitionName,
    outcomeRun,
    showConditionOutcome && isNullOrUndefined(inlineResult)
  );

  const { isFetching: isAgentRepetitionFetching, data: agentRepetitionRunData } = useAgentRepetition(
    !!isMonitoringView && !!runInstance && runIndex !== undefined && isAgent && !isA2AWorkflow,
    scopeId,
    selectedAgentRunId,
    scopeRepetitionName,
    parentRunData?.status,
    runIndex
  );

  const { isFetching: isAgentActionsRepetitionFetching, data: agentActionsRepetitionData } = useAgentActionsRepetition(
    !!isMonitoringView && runIndex !== undefined && isAgent,
    scopeId,
    runInstance?.id,
    scopeRepetitionName,
    runIndex
  );

  useEffect(() => {
    if (isNullOrUndefined(agentActionsRepetitionData)) {
      return;
    }
    // Child cards must not apply these results to a different Agent repetition's tool pages.
    const updatePayload = {
      nodeId: scopeId,
      runData: agentActionsRepetitionData,
      ...(agentRepetitionIdentity && { agentRepetitionIdentity }),
    };
    dispatch(setSubgraphRunData(updatePayload));
  }, [dispatch, agentRepetitionRunData, scopeId, agentActionsRepetitionData, isMonitoringView, agentRepetitionIdentity]);

  useEffect(() => {
    if (isMonitoringView && !isTimelineRepetitionSelected) {
      return;
    }
    if (!agentRepetitionRunData?.properties) {
      return;
    }
    if (agentRepetitionIdentity) {
      // The response must match the selected iteration, even during a refresh.
      if (isAgentRepetitionFetching || agentRepetitionRunData.name !== scopeRepetitionName) {
        return;
      }
      // The same selection can refresh as a run progresses. Only skip the exact response already in Redux.
      if (
        metadata?.agentRepetitionIdentity === agentRepetitionIdentity &&
        admittedAgentRepetition.current?.identity === agentRepetitionIdentity &&
        admittedAgentRepetition.current.data === agentRepetitionRunData
      ) {
        return;
      }
      admittedAgentRepetition.current = { identity: agentRepetitionIdentity, data: agentRepetitionRunData };
    } else if (metadata?.runData?.inputsLink?.uri === agentRepetitionRunData.properties.inputsLink?.uri) {
      return;
    }
    const updatePayload = {
      nodeId: scopeId,
      scopeRepetitionRunData: agentRepetitionRunData.properties,
      agentRepetitionIdentity,
    } as any;
    dispatch(updateAgenticGraph(updatePayload));
    dispatch(updateAgenticMetadata(updatePayload));
  }, [
    dispatch,
    agentRepetitionRunData,
    scopeId,
    selfRunData?.correlation?.actionTrackingId,
    isMonitoringView,
    isTimelineRepetitionSelected,
    metadata,
    agentRepetitionIdentity,
    isAgentRepetitionFetching,
    scopeRepetitionName,
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
  }, [dispatch, isMonitoringView, isTimelineRepetitionSelected, repetitionRunData, scopeId, selfRunData?.correlation?.actionTrackingId]);

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

  const nodeClick = useCallback(
    (e?: React.MouseEvent) => {
      // Shift/Ctrl/Meta-click on the card body toggles the node in the multi-selection set instead of
      // opening its panel. The collapse toggle stops propagation, so shift-clicking the chevron still
      // expands/collapses nested scopes without triggering multi-selection here.
      if (e?.shiftKey || e?.ctrlKey || e?.metaKey) {
        e?.stopPropagation();
        dispatch(toggleNodeSelection(scopeId));
        return;
      }
      dispatch(changePanelNode(scopeId));
    },
    [dispatch, scopeId]
  );

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

  const legacyLoading = useMemo(
    () =>
      isRepetitionFetching ||
      isAgentRepetitionFetching ||
      isAgentActionsRepetitionFetching ||
      opQuery.isLoading ||
      (!brandColor && !iconUri),
    [brandColor, iconUri, opQuery.isLoading, isRepetitionFetching, isAgentRepetitionFetching, isAgentActionsRepetitionFetching]
  );
  const isLoading = shared
    ? isRepetitionFetching || isAgentRepetitionFetching || isAgentActionsRepetitionFetching || opQuery.isLoading
    : legacyLoading;

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
      toolString: intl.formatMessage(
        {
          defaultMessage: '{actionCount, plural, one {# Tool} =0 {0 Tools} other {# Tools}}',
          id: 'Fmt/E7',
          description: 'This is the number of tools to be completed in a group',
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

  const { errorMessages } = useMemo(() => {
    const allMessages: string[] = [];

    if (errorInfo && errorInfo.level !== ErrorLevel.DynamicOutputs) {
      const { message } = errorInfo;
      allMessages.push(message);
    }

    if (opQuery.isError) {
      allMessages.push(intlText.opManifestErrorText);
    }

    if (settingValidationErrors?.length > 0) {
      allMessages.push(intlText.settingValidationErrorText);
    }

    if (parameterValidationErrors?.length > 0) {
      allMessages.push(intlText.parameterValidationErrorText);
    }

    if (flowErrors?.length > 0) {
      allMessages.push(intlText.flowErrorText);
    }

    return { errorMessages: allMessages };
  }, [
    errorInfo,
    opQuery.isError,
    settingValidationErrors?.length,
    parameterValidationErrors?.length,
    flowErrors?.length,
    intlText.opManifestErrorText,
    intlText.settingValidationErrorText,
    intlText.parameterValidationErrorText,
    intlText.flowErrorText,
  ]);

  const shouldShowPager = (normalizedType === constants.NODE.TYPE.FOREACH || isAgent) && isMonitoringView;
  const useScopedAgentMonitoringData = shared && isMonitoringView && isAgent && isTimelineRepetitionSelected && !!agentRepetitionIdentity;
  const hasCurrentAgentMonitoringData = !useScopedAgentMonitoringData || metadata?.agentRepetitionIdentity === agentRepetitionIdentity;
  // The run summary belongs to the top-level Agent, not to a previous page or a different parent iteration.
  const scopedRunData = hasCurrentAgentMonitoringData
    ? runData
    : parentRunIndex === undefined
      ? getRecordEntry(runInstance?.properties?.actions, scopeId)
      : undefined;

  const renderLoopsPager = useMemo(() => {
    // The Agent's own pager selects repetitions; keep it usable while the tool cards wait for the requested page.
    if (!Array.isArray(metadata?.runData) && metadata?.runData?.status && !equals(metadata.runData.status, 'InProgress')) {
      const focusElement = (index: number, id: string) => {
        dispatch(setFocusElement(`${id}-${index}-0`));
      };
      // Flag-on swaps only the pager presentation; run-index state and focus behavior stay identical.
      const Pager = shared ? SharedLoopsPager : LoopsPager;
      return <Pager metadata={metadata} scopeId={scopeId} collapsed={graphCollapsed} focusElement={focusElement} />;
    }
    return null;
  }, [dispatch, graphCollapsed, metadata, scopeId, shared]);

  const nodeIndex = useNodeIndex(id);

  if (!node) {
    return null;
  }

  const collapsedText = isAgent
    ? intlText.toolString
    : isSwitch
      ? intlText.caseString
      : isConditional
        ? intlText.caseString
        : intlText.actionString;

  const isFooter = id.endsWith('#footer');
  // Shared cards own the collapsed count; the Agent tools panel heading already states the tool count.
  const sharedCountLabel: NodeFrameCountLabel | undefined =
    shared && graphCollapsed && !isFooter && !(isAgent && data?.toolsPanel)
      ? isConditional
        ? { count: (trueBranchMetadata?.actionCount ?? 0) + (falseBranchMetadata?.actionCount ?? 0), unit: 'actions' }
        : { count: actionCount, unit: isAgent ? 'tools' : isSwitch ? 'cases' : 'actions' }
      : undefined;
  const showEmptyGraphComponents = isLeaf && !graphCollapsed && !isFooter && !isAgent;

  const isCardActive = isMonitoringView ? !isNullOrUndefined(scopedRunData?.status) : true;
  const handleAxis = data?.handleAxis === 'horizontal' ? 'horizontal' : 'vertical';
  const branchPorts = (data?.branchPorts ?? []) as BranchPort[];
  const takenOutput = showConditionOutcome
    ? getConditionTakenOutput(normalizedType, inlineResult ?? getExpressionResultFromOutputs(linkedOutputs), node, branchPorts)
    : undefined;
  const inputSlot = <EdgeDrawTargetHandle contained axis={handleAxis} />;
  const sourceSlot = isFooter ? (
    <EdgeDrawSourceHandle axis={handleAxis} contained highlighted={selected || isMultiSelected} />
  ) : (
    <DefaultHandle axis={handleAxis} contained type="source" />
  );
  const model = getScopeModel(node);
  const Card = shared ? (presentation.family === 'agent' ? SharedAgentScopeCard : SharedScopeCard) : ActionCard;

  return (
    <>
      <div className="msla-scope-card nopan" ref={ref as any} style={shared ? { width: presentation.size?.width } : undefined}>
        <div ref={rootRef}>
          {!shared || presentation.family === 'scope' ? <EdgeDrawTargetHandle axis={handleAxis} /> : null}
          <Card
            family={presentation.family}
            handleAxis={handleAxis}
            id={scopeId}
            active={isCardActive}
            brandColor={brandColor}
            title={label}
            icon={iconUri}
            comment={nodeComment}
            connectorName={connectorName?.result}
            drag={drag}
            dragPreview={dragPreview}
            errorMessages={errorMessages}
            isDragging={isDragging}
            isLoading={isLoading}
            isSelected={selected || isMultiSelected}
            isPinned={isPinned}
            runData={scopedRunData}
            readOnly={readOnly}
            onContextMenu={onContextMenu}
            onClick={nodeClick}
            onDeleteClick={deleteClick}
            onCopyClick={shared ? copyClick : undefined}
            setFocus={shouldFocus}
            nodeIndex={nodeIndex}
            isScope={true}
            collapsed={graphCollapsed}
            handleCollapse={handleGraphCollapse}
            {...(shared && {
              operationType: node.type,
              inputSlot,
              outputSlots: branchPorts.length
                ? branchPorts.map((port) => <DefaultHandle key={port.id} axis={handleAxis} id={port.id} contained type="source" />)
                : [sourceSlot],
              caseCount: branchPorts.length || undefined,
              model: typeof model === 'string' && model.length > 0 ? model : undefined,
              footerAction: shouldShowPager && (isAgent || (presentation.hasLoopPager && !graphCollapsed)) ? renderLoopsPager : undefined,
              description: opQuery.data?.properties?.description,
              isMonitoringView,
              toolsPanel: data?.toolsPanel as ComponentProps<typeof SharedScopeCard>['toolsPanel'],
              titleLines: presentation.titleLines,
              countLabel: sharedCountLabel,
              takenOutput,
            })}
          />
          {showCopyCallout ? <CopyTooltip id={scopeId} targetRef={rootRef} hideTooltip={clearCopyCallout} /> : null}
          {shouldShowPager && !shared ? renderLoopsPager : null}
          {!shared || presentation.family === 'scope' ? (
            isFooter ? (
              <EdgeDrawSourceHandle axis={handleAxis} highlighted={selected || isMultiSelected} />
            ) : (
              <DefaultHandle axis={handleAxis} type="source" />
            )
          ) : null}
        </div>
      </div>
      {graphCollapsed && !isFooter && !shared ? (
        <p className="no-actions-text" data-automation-id={`scope-${id}-no-actions`}>
          {collapsedText}
        </p>
      ) : null}
      {isAgent && actionCount < 1 && !graphCollapsed && !shared ? (
        <p className="no-actions-text" style={{ margin: shouldShowPager ? 0 : '1em 0' }} data-automation-id={`scope-${id}-no-tools`}>
          {isMonitoringView ? intlText.emptyAgent : intlText.addTool}
        </p>
      ) : null}
      {showEmptyGraphComponents ? (
        readOnly ? (
          <p className="no-actions-text">{intlText.noActions}</p>
        ) : (
          <div className={'edge-drop-zone-container'} style={shared && handleAxis === 'horizontal' ? horizontalTerminalStyle : undefined}>
            <DropZone
              graphId={scopeId}
              parentId={id}
              isLeaf={isLeaf}
              tabIndex={nodeIndex}
              axis={handleAxis}
              {...(data?.presentation ? { sharedPresentation: shared } : {})}
            />
          </div>
        )
      ) : null}
    </>
  );
};

ScopeCardNode.displayName = 'ScopeNode';

export default memo(ScopeCardNode);
