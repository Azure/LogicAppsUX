import constants from '../../common/constants';
import { getMonitoringError } from '../../common/utilities/error';
import { moveOperation } from '../../core/actions/bjsworkflow/move';
import { useMonitoringView, useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { setShowDeleteModal } from '../../core/state/designerView/designerViewSlice';
import {
  useBrandColor,
  useIconUri,
  useParameterValidationErrors,
  useTokenDependencies,
} from '../../core/state/operation/operationSelector';
import { useIsNodeSelected } from '../../core/state/panel/panelSelectors';
import { changePanelNode, selectPanelTab, setSelectedNodeId } from '../../core/state/panel/panelSlice';
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
  useParentRunId,
  useNodeDescription,
  useShouldNodeFocus,
} from '../../core/state/workflow/workflowSelectors';
import { setRepetitionRunData, toggleCollapsedGraphId } from '../../core/state/workflow/workflowSlice';
import type { AppDispatch, RootState } from '../../core/store';
import { LoopsPager } from '../common/LoopsPager/LoopsPager';
import { getRepetitionName } from '../common/LoopsPager/helper';
import { DropZone } from '../connections/dropzone';
import { DeleteMenuItem } from '../menuItems/deleteMenuItem';
import { ResubmitMenuItem } from '../menuItems/resubmitMenuItem';
import { MessageBarType } from '@fluentui/react';
import { RunService, WorkflowService, getRecordEntry, removeIdTag } from '@microsoft/logic-apps-shared';
import { ScopeCard } from '@microsoft/designer-ui';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDrag } from 'react-dnd';
import { useIntl } from 'react-intl';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { Handle, Position, useOnViewportChange, type NodeProps } from '@xyflow/react';
import { CopyMenuItem } from '../menuItems';
import { copyScopeOperation } from '../../core/actions/bjsworkflow/copypaste';
import { Tooltip } from '@fluentui/react-components';
import { useHotkeys } from 'react-hotkeys-hook';
import { useIsNodePinned } from '../../core/state/panelV2/panelSelectors';
import { RunAfterMenuItem } from '../menuItems/runAfterMenuItem';
import { RUN_AFTER_PANEL_TAB } from './constants';
import { shouldDisplayRunAfter } from './helpers';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ScopeCardNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const scopeId = removeIdTag(id);
  const nodeComment = useNodeDescription(scopeId);
  const shouldFocus = useShouldNodeFocus(scopeId);
  const node = useActionMetadata(scopeId);
  const operationsInfo = useAllOperations();

  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const readOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();

  const rootState = useSelector((state: RootState) => state);
  const metadata = useNodeMetadata(scopeId);
  const parentRunIndex = useParentRunIndex(scopeId);
  const runInstance = useRunInstance();
  const runData = useRunData(scopeId);
  const parentRunId = useParentRunId(scopeId);
  const parenRunData = useRunData(parentRunId ?? '');
  const nodesMetaData = useNodesMetadata();
  const repetitionName = getRepetitionName(parentRunIndex, scopeId, nodesMetaData, operationsInfo);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isTrigger = useMemo(() => metadata?.graphId === 'root' && metadata?.isRoot, [metadata]);

  const { status: statusRun, error: errorRun, code: codeRun, repetitionCount } = runData ?? {};

  const getRunRepetition = () => {
    if (parenRunData?.status === constants.FLOW_STATUS.SKIPPED) {
      return {
        properties: {
          status: constants.FLOW_STATUS.SKIPPED,
          inputsLink: null,
          outputsLink: null,
          startTime: null,
          endTime: null,
          trackingId: null,
          correlation: null,
        },
      };
    }
    return RunService().getRepetition({ nodeId: scopeId, runId: runInstance?.id }, repetitionName);
  };

  const onRunRepetitionSuccess = async (runDefinition: LogicAppsV2.RunRepetition) => {
    dispatch(setRepetitionRunData({ nodeId: scopeId, runData: runDefinition.properties as LogicAppsV2.WorkflowRunAction }));
  };

  const {
    refetch,
    isLoading: isRepetitionLoading,
    isRefetching: isRepetitionRefetching,
  } = useQuery<any>(
    ['runInstance', { nodeId: scopeId, runId: runInstance?.id, repetitionName, parentStatus: parenRunData?.status }],
    getRunRepetition,
    {
      refetchOnWindowFocus: false,
      initialData: null,
      refetchOnMount: true,
      onSuccess: onRunRepetitionSuccess,
      enabled: parentRunIndex !== undefined && isMonitoringView && repetitionCount !== undefined,
    }
  );

  useEffect(() => {
    if (parentRunIndex !== undefined && isMonitoringView) {
      refetch();
    }
  }, [dispatch, parentRunIndex, isMonitoringView, refetch, repetitionName, parenRunData?.status]);
  const dependencies = useTokenDependencies(scopeId);
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
        isScope: true,
      },
      canDrag: !readOnly,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [readOnly, metadata]
  );

  const isPinned = useIsNodePinned(scopeId);
  const selected = useIsNodeSelected(scopeId);
  const brandColor = useBrandColor(scopeId);
  const iconUri = useIconUri(scopeId);
  const isLeaf = useIsLeafNode(id);
  const label = useNodeDisplayName(scopeId);

  const [showCopyCallout, setShowCopyCallout] = useState(false);

  useOnViewportChange({
    onStart: useCallback(() => {
      if (showCopyCallout) {
        setShowCopyCallout(false);
      }
    }, [showCopyCallout]),
  });

  const nodeClick = useCallback(() => {
    dispatch(changePanelNode(scopeId));
  }, [dispatch, scopeId]);

  const graphCollapsed = useIsGraphCollapsed(scopeId);
  const handleGraphCollapse = useCallback(() => {
    dispatch(toggleCollapsedGraphId(scopeId));
  }, [dispatch, scopeId]);

  const deleteClick = useCallback(() => {
    dispatch(setSelectedNodeId(scopeId));
    dispatch(setShowDeleteModal(true));
  }, [dispatch, scopeId]);

  const copyClick = useCallback(() => {
    setShowCopyCallout(true);
    dispatch(copyScopeOperation({ nodeId: id }));
    setTimeout(() => {
      setShowCopyCallout(false);
    }, 3000);
  }, [dispatch, id]);

  const resubmitClick = useCallback(() => {
    WorkflowService().resubmitWorkflow?.(runInstance?.name ?? '', [id]);
  }, [runInstance, id]);

  const runAfterClick = useCallback(() => {
    dispatch(changePanelNode(scopeId));
    dispatch(selectPanelTab(RUN_AFTER_PANEL_TAB));
  }, [dispatch, scopeId]);

  const operationFromWorkflow = getRecordEntry(rootState.workflow.operations, scopeId) as LogicAppsV2.OperationDefinition;
  const runAfter = shouldDisplayRunAfter(operationFromWorkflow, isTrigger);

  const ref = useHotkeys(['meta+c', 'ctrl+c'], copyClick, { preventDefault: true });
  const contextMenuItems: JSX.Element[] = useMemo(
    () => [
      <DeleteMenuItem key={'delete'} onClick={deleteClick} showKey />,
      <CopyMenuItem key={'copy'} isTrigger={false} isScope={true} onClick={copyClick} showKey />,
      ...(runData?.canResubmit ? [<ResubmitMenuItem key={'resubmit'} onClick={resubmitClick} />] : []),
      ...(runAfter ? [<RunAfterMenuItem key={'run after'} onClick={runAfterClick} />] : []),
    ],
    [deleteClick, copyClick, runData?.canResubmit, resubmitClick, runAfterClick, runAfter]
  );

  const opQuery = useOperationQuery(scopeId);

  const isLoading = useMemo(
    () => isRepetitionLoading || isRepetitionRefetching || opQuery.isLoading || (!brandColor && !iconUri),
    [brandColor, iconUri, opQuery.isLoading, isRepetitionLoading, isRepetitionRefetching]
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

  const opManifestErrorText = intl.formatMessage({
    defaultMessage: 'Error fetching manifest',
    id: 'HmcHoE',
    description: 'Error message when manifest fails to load',
  });

  const settingValidationErrors = useSettingValidationErrors(scopeId);
  const settingValidationErrorText = intl.formatMessage({
    defaultMessage: 'Invalid settings',
    id: 'Jil/Wa',
    description: 'Text to explain that there are invalid settings for this node',
  });

  const parameterValidationErrors = useParameterValidationErrors(scopeId);
  const parameterValidationErrorText = intl.formatMessage({
    defaultMessage: 'Invalid parameters',
    id: 'Tmr/9e',
    description: 'Text to explain that there are invalid parameters for this node',
  });

  const { errorMessage, errorLevel } = useMemo(() => {
    if (opQuery?.isError) {
      return { errorMessage: opManifestErrorText, errorLevel: MessageBarType.error };
    }
    if (settingValidationErrors?.length > 0) {
      return { errorMessage: settingValidationErrorText, errorLevel: MessageBarType.severeWarning };
    }
    if (parameterValidationErrors?.length > 0) {
      return { errorMessage: parameterValidationErrorText, errorLevel: MessageBarType.severeWarning };
    }

    if (isMonitoringView) {
      return getMonitoringError(errorRun, statusRun, codeRun);
    }

    return { errorMessage: undefined, errorLevel: undefined };
  }, [
    opQuery?.isError,
    opManifestErrorText,
    settingValidationErrors?.length,
    settingValidationErrorText,
    parameterValidationErrors?.length,
    parameterValidationErrorText,
    errorRun,
    isMonitoringView,
    codeRun,
    statusRun,
  ]);

  if (!node) {
    return null;
  }

  const normalizedType = node?.type.toLowerCase();
  const actionCount = metadata?.actionCount ?? 0;

  const actionString = intl.formatMessage(
    {
      defaultMessage: '{actionCount, plural, one {# Action} =0 {0 Actions} other {# Actions}}',
      id: 'B/JzwK',
      description: 'This is the number of actions to be completed in a group',
    },
    { actionCount }
  );

  const caseString = intl.formatMessage(
    {
      defaultMessage: '{actionCount, plural, one {# Case} =0 {0 Cases} other {# Cases}}',
      id: 'KX1poC',
      description: 'This is the number of cases or options the program can take',
    },
    { actionCount }
  );

  const collapsedText =
    normalizedType === constants.NODE.TYPE.SWITCH || normalizedType === constants.NODE.TYPE.IF ? caseString : actionString;

  const isFooter = id.endsWith('#footer');
  const showEmptyGraphComponents = isLeaf && !graphCollapsed && !isFooter;

  const copiedText = intl.formatMessage({
    defaultMessage: 'Copied!',
    id: 'NE54Uu',
    description: 'Copied text',
  });

  return (
    <>
      <div className="msla-scope-card nopan" ref={ref as any}>
        <div ref={rootRef}>
          <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
          <ScopeCard
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
            isMonitoringView={isMonitoringView}
            title={label}
            readOnly={readOnly}
            onClick={nodeClick}
            onDeleteClick={deleteClick}
            selectionMode={selected ? 'selected' : isPinned ? 'pinned' : false}
            contextMenuItems={contextMenuItems}
            runData={runData}
            commentBox={comment}
            setFocus={shouldFocus}
          />
          <Tooltip
            positioning={{ target: rootRef.current, position: 'below', align: 'end' }}
            withArrow
            content={copiedText}
            relationship="description"
            visible={showCopyCallout}
          />
          {isMonitoringView && normalizedType === constants.NODE.TYPE.FOREACH ? (
            <LoopsPager metadata={metadata} scopeId={scopeId} collapsed={graphCollapsed} />
          ) : null}
          <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
        </div>
      </div>
      {graphCollapsed && !isFooter ? <p className="no-actions-text">{collapsedText}</p> : null}
      {showEmptyGraphComponents ? (
        readOnly ? (
          <p className="no-actions-text">No Actions</p>
        ) : (
          <div className={'edge-drop-zone-container'}>
            <DropZone graphId={scopeId} parentId={id} isLeaf={isLeaf} />
          </div>
        )
      ) : null}
    </>
  );
};

ScopeCardNode.displayName = 'ScopeNode';

export default memo(ScopeCardNode);
