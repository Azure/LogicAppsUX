/* eslint-disable @typescript-eslint/no-empty-function */
import constants from '../../common/constants';
import { getMonitoringError } from '../../common/utilities/error';
import type { AppDispatch } from '../../core';
import { copyOperation } from '../../core/actions/bjsworkflow/copypaste';
import { deleteOperation } from '../../core/actions/bjsworkflow/delete';
import { moveOperation } from '../../core/actions/bjsworkflow/move';
import {
  useMonitoringView,
  useNodeSelectAdditionalCallback,
  useReadOnly,
  useSuppressDefaultNodeSelectFunctionality,
  useUnitTest,
} from '../../core/state/designerOptions/designerOptionsSelectors';
import { ErrorLevel } from '../../core/state/operation/operationMetadataSlice';
import {
  useOperationErrorInfo,
  useSecureInputsOutputs,
  useParameterStaticResult,
  useParameterValidationErrors,
  useTokenDependencies,
} from '../../core/state/operation/operationSelector';
import { useIsNodeSelected } from '../../core/state/panel/panelSelectors';
import { changePanelNode, isolateTab, setSelectedNodeId, showDefaultTabs } from '../../core/state/panel/panelSlice';
import {
  useAllOperations,
  useBrandColor,
  useConnectorName,
  useIconUri,
  useIsConnectionRequired,
  useNodeConnectionName,
  useOperationInfo,
  useOperationQuery,
} from '../../core/state/selectors/actionMetadataSelector';
import { useSettingValidationErrors } from '../../core/state/setting/settingSelector';
import { useStaticResultSchema } from '../../core/state/staticresultschema/staitcresultsSelector';
import {
  useIsLeafNode,
  useNodeDescription,
  useNodeDisplayName,
  useNodeMetadata,
  useNodesMetadata,
  useRunData,
  useParentRunIndex,
  useRunInstance,
  useShouldNodeFocus,
  useRetryHistory,
  useParentRunId,
} from '../../core/state/workflow/workflowSelectors';
import { setRepetitionRunData } from '../../core/state/workflow/workflowSlice';
import { getRepetitionName } from '../common/LoopsPager/helper';
import { DropZone } from '../connections/dropzone';
import type { ICalloutContentStyles } from '@fluentui/react';
import { Callout, DirectionalHint, MessageBarType } from '@fluentui/react';
import { RunService, WorkflowService } from '@microsoft/designer-client-services-logic-apps';
import type { MenuItemOption } from '@microsoft/designer-ui';
import { Card, MenuItemType, DeleteNodeModal, useId } from '@microsoft/designer-ui';
import type { LogicAppsV2 } from '@microsoft/utils-logic-apps';
import { WORKFLOW_NODE_TYPES } from '@microsoft/utils-logic-apps';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useDrag } from 'react-dnd';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useDispatch } from 'react-redux';
import { Handle, Position, useOnViewportChange } from 'reactflow';
import type { NodeProps } from 'reactflow';

const copyCalloutStyles: Partial<ICalloutContentStyles> = {
  root: { padding: 10 },
};

const DefaultNode = ({ targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const readOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();
  const isUnitTest = useUnitTest();
  const intl = useIntl();
  const tooltipId = useId();

  const dispatch = useDispatch<AppDispatch>();
  const operationsInfo = useAllOperations();
  const errorInfo = useOperationErrorInfo(id);
  const metadata = useNodeMetadata(id);
  const operationInfo = useOperationInfo(id);
  const connectorName = useConnectorName(operationInfo);
  const isTrigger = useMemo(() => metadata?.graphId === 'root' && metadata?.isRoot, [metadata]);
  const parentRunIndex = useParentRunIndex(id);
  const runInstance = useRunInstance();
  const runData = useRunData(id);
  const parentRunId = useParentRunId(id);
  const parenRunData = useRunData(parentRunId ?? '');
  const nodesMetaData = useNodesMetadata();
  const repetitionName = getRepetitionName(parentRunIndex, id, nodesMetaData, operationsInfo);
  const runHistory = useRetryHistory(id);
  const isSecureInputsOutputs = useSecureInputsOutputs(id);
  const { status: statusRun, error: errorRun, code: codeRun, repetitionCount } = runData ?? {};

  const suppressDefaultNodeSelect = useSuppressDefaultNodeSelectFunctionality();
  const nodeSelectCallbackOverride = useNodeSelectAdditionalCallback();

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
    return RunService().getRepetition({ nodeId: id, runId: runInstance?.id }, repetitionName);
  };

  const onRunRepetitionSuccess = async (runDefinition: LogicAppsV2.RunInstanceDefinition) => {
    dispatch(setRepetitionRunData({ nodeId: id, runData: runDefinition.properties as any }));
  };

  const {
    refetch,
    isLoading: isRepetitionLoading,
    isRefetching: isRepetitionRefetching,
  } = useQuery<any>(
    ['runInstance', { nodeId: id, runId: runInstance?.id, repetitionName, parentStatus: parenRunData?.status }],
    getRunRepetition,
    {
      refetchOnWindowFocus: false,
      initialData: null,
      refetchIntervalInBackground: true,
      onSuccess: onRunRepetitionSuccess,
      enabled: parentRunIndex !== undefined && isMonitoringView && repetitionCount !== undefined,
    }
  );

  useEffect(() => {
    if (parentRunIndex !== undefined && isMonitoringView) {
      refetch();
    }
  }, [dispatch, parentRunIndex, isMonitoringView, refetch, repetitionName, parenRunData?.status]);

  const dependencies = useTokenDependencies(id);

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
        graphId: metadata?.graphId,
      },
      canDrag: !readOnly && !isTrigger,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [readOnly, metadata, dependencies]
  );

  const selected = useIsNodeSelected(id);
  const nodeComment = useNodeDescription(id);
  const connectionResult = useNodeConnectionName(id);
  const isConnectionRequired = useIsConnectionRequired(operationInfo);
  const hasSchema = useStaticResultSchema(operationInfo?.connectorId ?? '', operationInfo?.operationId ?? '');
  const isLeaf = useIsLeafNode(id);

  const showLeafComponents = useMemo(() => !readOnly && isLeaf, [readOnly, isLeaf]);

  const nodeClick = useCallback(() => {
    dispatch(setSelectedNodeId(id));

    if (nodeSelectCallbackOverride) {
      nodeSelectCallbackOverride(id);
    }

    if (suppressDefaultNodeSelect) return;
    dispatch(changePanelNode(id));
    if (isUnitTest) {
      dispatch(isolateTab(constants.PANEL_TAB_NAMES.MOCK_RESULTS));
    } else {
      dispatch(showDefaultTabs({ isMonitoringView, hasSchema: !!hasSchema, showRunHistory: !!runHistory }));
    }
  }, [dispatch, hasSchema, id, isMonitoringView, isUnitTest, nodeSelectCallbackOverride, runHistory, suppressDefaultNodeSelect]);

  const brandColor = useBrandColor(id);
  const iconUri = useIconUri(id);

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

  const label = useNodeDisplayName(id);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCopyCallout, setShowCopyCallout] = useState(false);

  useOnViewportChange({
    onStart: useCallback(() => {
      if (showCopyCallout) {
        setShowCopyCallout(false);
      }
    }, [showCopyCallout]),
  });

  const handleDeleteClick = () => setShowDeleteModal(true);
  const handleCopyClick = () => {
    setShowCopyCallout(true);
    dispatch(copyOperation({ nodeId: id }));
    setTimeout(() => {
      setShowCopyCallout(false);
    }, 3000);
  };
  const handleDelete = () => dispatch(deleteOperation({ nodeId: id, isTrigger: !!isTrigger }));

  const getMenuItems = (): MenuItemOption[] => {
    const deleteDescription = intl.formatMessage({
      defaultMessage: 'Delete',
      description: 'Delete text',
    });
    const disableTriggerDeleteText = intl.formatMessage({
      defaultMessage: 'Triggers cannot be deleted.',
      description: 'Text to explain that triggers cannot be deleted',
    });

    const copyAction = intl.formatMessage({
      defaultMessage: 'Copy Action',
      description: 'Copy Action text',
    });

    const copyTrigger = intl.formatMessage({
      defaultMessage: 'Copy Trigger',
      description: 'Copy Trigger text',
    });

    const copyDisabledText = intl.formatMessage({
      defaultMessage: 'This Action/Trigger cannot be copied.',
      description: 'Text to explain this action/trigger cannot be copied',
    });

    return [
      {
        key: deleteDescription,
        disabled: readOnly,
        disabledReason: disableTriggerDeleteText,
        iconName: 'Delete',
        title: deleteDescription,
        type: MenuItemType.Advanced,
        onClick: handleDeleteClick,
      },
      {
        key: isTrigger ? copyTrigger : copyAction,
        disabled: readOnly,
        disabledReason: copyDisabledText,
        iconName: 'Copy',
        title: isTrigger ? copyTrigger : copyAction,
        type: MenuItemType.Advanced,
        onClick: handleCopyClick,
      },
    ];
  };

  const getResubmitMenuItem = () => {
    const resubmitDescription = intl.formatMessage({
      defaultMessage: 'Resubmit a workflow run from this action',
      description: 'accessability text for the resubmit button',
    });

    const resubmitButtonText = intl.formatMessage({
      defaultMessage: 'Submit from this action',
      description: 'Button label for submitting a workflow to rerun from this action',
    });

    const handleResubmitClick = () => {
      WorkflowService().resubmitWorkflow?.(runInstance?.name ?? '', [id]);
    };
    return {
      key: resubmitDescription,
      disabled: false,
      iconName: 'PlaybackRate1x',
      title: resubmitButtonText,
      type: MenuItemType.Advanced,
      onClick: handleResubmitClick,
    };
  };
  const contextMenuOptions: MenuItemOption[] = getMenuItems();
  if (runData?.canResubmit) {
    contextMenuOptions.push(getResubmitMenuItem());
  }

  const opQuery = useOperationQuery(id);

  const isLoading = useMemo(
    () => isRepetitionLoading || isRepetitionRefetching || opQuery.isLoading,
    [opQuery.isLoading, isRepetitionLoading, isRepetitionRefetching]
  );

  const opManifestErrorText = intl.formatMessage({
    defaultMessage: 'Error fetching manifest',
    description: 'Error message when manifest fails to load',
  });

  const settingValidationErrors = useSettingValidationErrors(id);
  const settingValidationErrorText = intl.formatMessage({
    defaultMessage: 'Invalid settings',
    description: 'Text to explain that there are invalid settings for this node',
  });

  const parameterValidationErrors = useParameterValidationErrors(id);
  const parameterValidationErrorText = intl.formatMessage({
    defaultMessage: 'Invalid parameters',
    description: 'Text to explain that there are invalid parameters for this node',
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
    errorInfo,
    opQuery?.isError,
    settingValidationErrors?.length,
    parameterValidationErrors?.length,
    isMonitoringView,
    opManifestErrorText,
    settingValidationErrorText,
    parameterValidationErrorText,
    errorRun,
    statusRun,
    codeRun,
  ]);

  const shouldFocus = useShouldNodeFocus(id);
  const staticResults = useParameterStaticResult(id);

  const copiedText = intl.formatMessage({
    defaultMessage: 'Copied!',
    description: 'Copied text',
  });

  return (
    <>
      <div className="nopan" id={tooltipId}>
        <Handle className="node-handle top" type="target" position={targetPosition} isConnectable={false} />
        <Card
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
          isMonitoringView={isMonitoringView}
          runData={runData}
          readOnly={readOnly}
          onClick={nodeClick}
          selected={selected}
          contextMenuOptions={contextMenuOptions}
          setFocus={shouldFocus}
          staticResultsEnabled={!!staticResults}
          isSecureInputsOutputs={isSecureInputsOutputs}
        />
        {showCopyCallout ? (
          <Callout target={`#${tooltipId}`} styles={copyCalloutStyles} directionalHint={DirectionalHint.bottomRightEdge}>
            {copiedText}
          </Callout>
        ) : null}
        <Handle className="node-handle bottom" type="source" position={sourcePosition} isConnectable={false} />
      </div>
      {showLeafComponents ? (
        <div className={'edge-drop-zone-container'}>
          <DropZone graphId={metadata?.graphId ?? ''} parentId={id} isLeaf={isLeaf} />
        </div>
      ) : null}
      <DeleteNodeModal
        nodeId={id}
        nodeType={WORKFLOW_NODE_TYPES.OPERATION_NODE}
        isOpen={showDeleteModal}
        onDismiss={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </>
  );
};

DefaultNode.displayName = 'DefaultNode';

export default memo(DefaultNode);
