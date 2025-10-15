import { shouldEncodeParameterValueForOperationBasedOnMetadata } from '../../../core/utils/parameters/helper';
import constants from '../../../common/constants';
import type { AppDispatch, RootState } from '../../../core';
import { clearPanel, collapsePanel, updateParameterValidation, validateParameter } from '../../../core';
import { useReadOnly, useSuppressDefaultNodeSelectFunctionality } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { setShowDeleteModalNodeId } from '../../../core/state/designerView/designerViewSlice';
import { useIsA2AWorkflow } from '../../../core/state/designerView/designerViewSelectors';
import {
  useIsPanelCollapsed,
  useOperationAlternateSelectedNode,
  useOperationPanelSelectedNodeId,
} from '../../../core/state/panel/panelSelectors';
import { setAlternateSelectedNode, updatePanelLocation } from '../../../core/state/panel/panelSlice';
import { useUndoRedoClickToggle } from '../../../core/state/undoRedo/undoRedoSelectors';
import { useActionMetadata, useRunData, useRunInstance } from '../../../core/state/workflow/workflowSelectors';
import { replaceId, setNodeDescription } from '../../../core/state/workflow/workflowSlice';
import { isOperationNameValid, isTriggerNode } from '../../../core/utils/graph';
import { CommentMenuItem } from '../../menuItems/commentMenuItem';
import { DeleteMenuItem } from '../../menuItems/deleteMenuItem';
import { PinMenuItem } from '../../menuItems/pinMenuItem';
import { usePanelNodeData } from './usePanelNodeData';
import type { CommonPanelProps, PageActionTelemetryData } from '@microsoft/designer-ui';
import { PanelContainer, PanelScope } from '@microsoft/designer-ui';
import {
  equals,
  getObjectPropertyValue,
  getRecordEntry,
  HostService,
  isNullOrEmpty,
  isNullOrUndefined,
  SUBGRAPH_TYPES,
  WorkflowService,
} from '@microsoft/logic-apps-shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';

export const NodeDetailsPanel = (props: CommonPanelProps): JSX.Element => {
  const { isResizeable, panelLocation } = props;

  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();

  const readOnly = useReadOnly();
  const collapsed = useIsPanelCollapsed();

  const alternateSelectedNode = useOperationAlternateSelectedNode();
  const isA2AWorkflow = useIsA2AWorkflow();
  const alternateSelectedNodeId = alternateSelectedNode?.nodeId ?? '';
  const alternateSelectedNodePersistence = alternateSelectedNode?.persistence ?? 'selected';

  const selectedNode = useOperationPanelSelectedNodeId();

  const runData = useRunData(selectedNode);
  const { isTrigger, nodesMetadata, idReplacements, operationInfo, showTriggerInfo } = useSelector((state: RootState) => {
    const isAgent = equals(getRecordEntry(state.workflow.operations, selectedNode)?.type, 'agent');
    const isTrigger = isTriggerNode(selectedNode, state.workflow.nodesMetadata) && !isAgent;
    const operationInfo = state.operations.operationInfo[selectedNode];
    return {
      isTrigger,
      nodesMetadata: state.workflow.nodesMetadata,
      idReplacements: state.workflow.idReplacements,
      operationInfo,
      showTriggerInfo: isTrigger && operationInfo.type === constants.SERIALIZED_TYPE.REQUEST && !isA2AWorkflow,
    };
  });

  const [overrideWidth, setOverrideWidth] = useState<string | undefined>('480px');

  const inputs = useSelector((state: RootState) => state.operations.inputParameters[selectedNode]);

  const alternateSelectedNodeData = usePanelNodeData(alternateSelectedNodeId);
  const selectedNodeData = usePanelNodeData(selectedNode);
  const actionMetadata = useActionMetadata(selectedNode);
  const nodeType = actionMetadata?.type ?? '';

  const suppressDefaultNodeSelectFunctionality = useSuppressDefaultNodeSelectFunctionality();

  useEffect(() => {
    dispatch(updatePanelLocation(panelLocation));
  }, [dispatch, panelLocation]);

  const collapse = useCallback(() => {
    dispatch(collapsePanel());
  }, [dispatch]);

  const handleDeleteClick = useCallback(
    (nodeId: string) => {
      dispatch(setShowDeleteModalNodeId(nodeId));
    },
    [dispatch]
  );

  const handlePinClick = useCallback(
    (nodeId: string) => {
      dispatch(setAlternateSelectedNode({ nodeId }));
    },
    [dispatch]
  );

  const handleCommentMenuClick = useCallback(
    (nodeId: string): void => {
      const nodeData = nodeId === alternateSelectedNodeId ? alternateSelectedNodeData : selectedNodeData;
      const comment = nodeData?.comment;
      const showCommentBox = !isNullOrUndefined(comment);
      dispatch(
        setNodeDescription({
          nodeId,
          description: showCommentBox ? undefined : '',
        })
      );
    },
    [dispatch, alternateSelectedNodeId, alternateSelectedNodeData, selectedNodeData]
  );

  const getHeaderMenuItems = useCallback(
    (nodeId: string): JSX.Element[] => {
      const nodeData = nodeId === alternateSelectedNodeId ? alternateSelectedNodeData : selectedNodeData;
      const comment = nodeData?.comment;

      // Removing the 'add a description' button for subgraph nodes
      const isSubgraphContainer = nodeData?.subgraphType === SUBGRAPH_TYPES.SWITCH_CASE;
      const headerMenuItems: JSX.Element[] = [];
      if (!isSubgraphContainer && !isTrigger) {
        headerMenuItems.push(
          <CommentMenuItem key={'comment'} onClick={() => handleCommentMenuClick(nodeId)} hasComment={!isNullOrUndefined(comment)} />
        );
      }
      if (nodeId !== alternateSelectedNodeId) {
        headerMenuItems.push(<PinMenuItem key={'pin'} nodeId={selectedNode} onClick={() => handlePinClick(nodeId)} />);
      }
      headerMenuItems.push(
        <DeleteMenuItem
          key={'delete'}
          onClick={() => handleDeleteClick(nodeId)}
          isTrigger={isTrigger}
          operationType={operationInfo?.type}
        />
      );
      return headerMenuItems;
    },
    [
      handleCommentMenuClick,
      handleDeleteClick,
      handlePinClick,
      isTrigger,
      alternateSelectedNodeId,
      alternateSelectedNodeData,
      selectedNode,
      selectedNodeData,
      operationInfo?.type,
    ]
  );

  const onTitleChange = (originalId: string, newId: string): { valid: boolean; oldValue?: string; message: string } => {
    const validation = isOperationNameValid(originalId, newId, isTrigger, nodesMetadata, idReplacements, intl);
    return { valid: validation.isValid, oldValue: validation.isValid ? newId : originalId, message: validation.message };
  };

  const handleTitleUpdate = (originalId: string, newId: string) => {
    dispatch(replaceId({ originalId, newId }));
  };

  const onCommentChange = (nodeId: string, newDescription?: string) => {
    dispatch(setNodeDescription({ nodeId, description: newDescription }));
  };

  const dismissPanel = () => dispatch(clearPanel());

  const unpinAction = () => dispatch(setAlternateSelectedNode({ nodeId: '' }));

  const runInstance = useRunInstance();

  const resubmitClick = useCallback(
    (nodeId: string) => {
      if (!runInstance) {
        return;
      }
      WorkflowService().resubmitWorkflow?.(runInstance?.name ?? '', [nodeId]);
      dispatch(clearPanel());
    },
    [dispatch, runInstance]
  );

  const layerProps = {
    hostId: 'msla-layer-host',
    eventBubblingEnabled: true,
  };

  const commonPanelProps: CommonPanelProps = {
    ...props,
    isCollapsed: collapsed,
    toggleCollapse: dismissPanel,
    overrideWidth,
    layerProps,
    panelLocation,
    isResizeable,
  };

  const getChildRunNameFromOutputs = (outputs: any): string | undefined => {
    if (!isNullOrEmpty(outputs)) {
      return getObjectPropertyValue(outputs, ['headers', 'value', 'x-ms-workflow-run-id']);
    }
    return undefined;
  };

  const getChildWorkflowIdFromInputs = (childWorkflowInputs: any): string | undefined => {
    if (!isNullOrEmpty(childWorkflowInputs)) {
      const workflow = getObjectPropertyValue(childWorkflowInputs, ['host.workflow.id']);
      if (!isNullOrEmpty(workflow)) {
        return workflow.value;
      }
    }
    return undefined;
  };

  const runName = useMemo(() => {
    return getChildRunNameFromOutputs(runData?.outputs);
  }, [runData?.outputs]);

  const canShowLogicAppRun = useMemo(() => {
    return equals(nodeType, constants.NODE.TYPE.WORKFLOW) && !!runName && !!HostService() && !!HostService()?.openMonitorView;
  }, [nodeType, runName]);

  const showLogicAppRunClick = useCallback(() => {
    const workflowId = getChildWorkflowIdFromInputs(runData?.inputs);
    if (workflowId && runName && !!HostService()) {
      HostService().openMonitorView?.(workflowId, runName);
    }
  }, [runData?.inputs, runName]);

  // Re-render panel when undo/redo is performed to update panel parameter values, title etc.
  const undoRedoClickToggle = useUndoRedoClickToggle();

  return (
    <PanelContainer
      key={undoRedoClickToggle}
      {...commonPanelProps}
      panelScope={PanelScope.CardLevel}
      suppressDefaultNodeSelectFunctionality={suppressDefaultNodeSelectFunctionality}
      node={selectedNodeData}
      nodeHeaderItems={getHeaderMenuItems(selectedNode)}
      alternateSelectedNode={alternateSelectedNodeData}
      alternateSelectedNodePersistence={alternateSelectedNodePersistence}
      alternateSelectedNodeHeaderItems={getHeaderMenuItems(alternateSelectedNodeId)}
      readOnlyMode={readOnly}
      canResubmit={runData?.canResubmit ?? false}
      canShowLogicAppRun={canShowLogicAppRun}
      showLogicAppRun={showLogicAppRunClick}
      resubmitOperation={resubmitClick}
      onUnpinAction={unpinAction}
      onClose={() => {
        Object.keys(inputs?.parameterGroups ?? {}).forEach((parameterGroup) => {
          inputs.parameterGroups[parameterGroup].parameters.forEach((parameter: any) => {
            const validationErrors = validateParameter(
              parameter,
              parameter.value,
              /* shouldValidateUnknownParameterAsError */ undefined,
              shouldEncodeParameterValueForOperationBasedOnMetadata(operationInfo)
            );
            dispatch(
              updateParameterValidation({
                nodeId: selectedNode,
                groupId: parameterGroup,
                parameterId: parameter.id,
                validationErrors,
              })
            );
          });
        });
        collapse();
      }}
      showTriggerInfo={showTriggerInfo && !readOnly}
      isTrigger={isTrigger}
      hideComment={isA2AWorkflow && isTrigger}
      trackEvent={handleTrackEvent}
      onCommentChange={onCommentChange}
      onTitleChange={onTitleChange}
      handleTitleUpdate={handleTitleUpdate}
      setOverrideWidth={setOverrideWidth}
    />
  );
};

// TODO: 12798935 Analytics (event logging)
// eslint-disable-next-line @typescript-eslint/no-empty-function
const handleTrackEvent = (_data: PageActionTelemetryData): void => {};
