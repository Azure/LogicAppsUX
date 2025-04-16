import { shouldEncodeParameterValueForOperationBasedOnMetadata } from '../../../core/utils/parameters/helper';
import constants from '../../../common/constants';
import type { AppDispatch, RootState } from '../../../core';
import { clearPanel, collapsePanel, updateParameterValidation, validateParameter } from '../../../core';
import { useReadOnly, useSuppressDefaultNodeSelectFunctionality } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { setShowDeleteModalNodeId } from '../../../core/state/designerView/designerViewSlice';
import {
  useIsPanelCollapsed,
  useOperationAlternateSelectedNode,
  useOperationPanelSelectedNodeId,
} from '../../../core/state/panel/panelSelectors';
import { expandPanel, setAlternateSelectedNode, updatePanelLocation } from '../../../core/state/panel/panelSlice';
import { useUndoRedoClickToggle } from '../../../core/state/undoRedo/undoRedoSelectors';
import { useActionMetadata, useRunData, useRunInstance } from '../../../core/state/workflow/workflowSelectors';
import { replaceId, setNodeDescription } from '../../../core/state/workflow/workflowSlice';
import { isOperationNameValid, isRootNodeInGraph } from '../../../core/utils/graph';
import { CommentMenuItem } from '../../menuItems/commentMenuItem';
import { DeleteMenuItem } from '../../menuItems/deleteMenuItem';
import { PinMenuItem } from '../../menuItems/pinMenuItem';
import { usePanelNodeData } from './usePanelNodeData';
import type { CommonPanelProps, PageActionTelemetryData } from '@microsoft/designer-ui';
import { PanelContainer, PanelScope } from '@microsoft/designer-ui';
import {
  equals,
  getObjectPropertyValue,
  HostService,
  isNullOrEmpty,
  isNullOrUndefined,
  SUBGRAPH_TYPES,
  WorkflowService,
} from '@microsoft/logic-apps-shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export const NodeDetailsPanel = (props: CommonPanelProps): JSX.Element => {
  const { isResizeable, panelLocation } = props;

  const dispatch = useDispatch<AppDispatch>();

  const readOnly = useReadOnly();
  const collapsed = useIsPanelCollapsed();

  const alternateSelectedNode = useOperationAlternateSelectedNode();
  const alternateSelectedNodeId = alternateSelectedNode?.nodeId ?? '';
  const alternateSelectedNodePersistence = alternateSelectedNode?.persistence ?? 'selected';

  const selectedNode = useOperationPanelSelectedNodeId();

  const runData = useRunData(selectedNode);
  const { isTriggerNode, nodesMetadata, idReplacements, operationInfo, showTriggerInfo } = useSelector((state: RootState) => {
    const isTrigger = isRootNodeInGraph(selectedNode, 'root', state.workflow.nodesMetadata);
    const operationInfo = state.operations.operationInfo[selectedNode];
    return {
      isTriggerNode: isTrigger,
      nodesMetadata: state.workflow.nodesMetadata,
      idReplacements: state.workflow.idReplacements,
      operationInfo,
      showTriggerInfo: isTrigger && operationInfo.type === constants.SERIALIZED_TYPE.REQUEST,
    };
  });

  const [overrideWidth, setOverrideWidth] = useState<string | undefined>();

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

  const expand = useCallback(() => {
    dispatch(expandPanel());
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
      if (!isSubgraphContainer && !isTriggerNode) {
        headerMenuItems.push(
          <CommentMenuItem key={'comment'} onClick={() => handleCommentMenuClick(nodeId)} hasComment={!isNullOrUndefined(comment)} />
        );
      }
      if (nodeId !== alternateSelectedNodeId) {
        headerMenuItems.push(<PinMenuItem key={'pin'} nodeId={selectedNode} onClick={() => handlePinClick(nodeId)} />);
      }
      headerMenuItems.push(<DeleteMenuItem key={'delete'} onClick={() => handleDeleteClick(nodeId)} />);
      return headerMenuItems;
    },
    [
      handleCommentMenuClick,
      handleDeleteClick,
      handlePinClick,
      isTriggerNode,
      alternateSelectedNodeId,
      alternateSelectedNodeData,
      selectedNode,
      selectedNodeData,
    ]
  );

  const onTitleChange = (originalId: string, newId: string): { valid: boolean; oldValue?: string } => {
    const isValid = isOperationNameValid(originalId, newId, isTriggerNode, nodesMetadata, idReplacements);
    return { valid: isValid, oldValue: isValid ? newId : originalId };
  };

  const handleTitleUpdate = (originalId: string, newId: string) => {
    dispatch(replaceId({ originalId, newId }));
  };

  const onCommentChange = (nodeId: string, newDescription?: string) => {
    dispatch(setNodeDescription({ nodeId, description: newDescription }));
  };

  const togglePanel = (): void => (collapsed ? expand() : collapse());
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
      noNodeSelected={!selectedNode}
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
      toggleCollapse={() => {
        // Only run validation when collapsing the panel
        if (!collapsed) {
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
        }
        togglePanel();
      }}
      showTriggerInfo={showTriggerInfo && !readOnly}
      isTrigger={isTriggerNode}
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
