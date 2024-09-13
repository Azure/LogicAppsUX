import constants from '../../../common/constants';
import type { AppDispatch, RootState } from '../../../core';
import { clearPanel, collapsePanel, updateParameterValidation, validateParameter } from '../../../core';
import { renameCustomCode } from '../../../core/state/customcode/customcodeSlice';
import { useReadOnly, useSuppressDefaultNodeSelectFunctionality } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { setShowDeleteModalNodeId } from '../../../core/state/designerView/designerViewSlice';
import { updateParameterEditorViewModel } from '../../../core/state/operation/operationMetadataSlice';
import {
  useIsPanelCollapsed,
  useOperationPanelPinnedNodeId,
  useOperationPanelSelectedNodeId,
} from '../../../core/state/panel/panelSelectors';
import { expandPanel, setPinnedNode, updatePanelLocation } from '../../../core/state/panel/panelSlice';
import { useStateHistoryItemIndex } from '../../../core/state/undoRedo/undoRedoSelectors';
import { useActionMetadata, useRunData, useRunInstance } from '../../../core/state/workflow/workflowSelectors';
import { replaceId, setNodeDescription } from '../../../core/state/workflow/workflowSlice';
import { isOperationNameValid, isRootNodeInGraph } from '../../../core/utils/graph';
import { getCustomCodeFileName, getParameterFromName, ParameterGroupKeys } from '../../../core/utils/parameters/helper';
import { CommentMenuItem } from '../../menuItems/commentMenuItem';
import { DeleteMenuItem } from '../../menuItems/deleteMenuItem';
import { PinMenuItem } from '../../menuItems/pinMenuItem';
import { usePanelNodeData } from './usePanelNodeData';
import type { CommonPanelProps, PageActionTelemetryData } from '@microsoft/designer-ui';
import { isCustomCode, PanelContainer, PanelScope } from '@microsoft/designer-ui';
import {
  equals,
  getObjectPropertyValue,
  HostService,
  isNullOrEmpty,
  isNullOrUndefined,
  replaceWhiteSpaceWithUnderscore,
  splitFileName,
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

  const pinnedNode = useOperationPanelPinnedNodeId();
  const selectedNode = useOperationPanelSelectedNodeId();

  const runData = useRunData(selectedNode);
  const { isTriggerNode, nodesMetadata, idReplacements } = useSelector((state: RootState) => ({
    isTriggerNode: isRootNodeInGraph(selectedNode, 'root', state.workflow.nodesMetadata),
    nodesMetadata: state.workflow.nodesMetadata,
    idReplacements: state.workflow.idReplacements,
  }));

  const [overrideWidth, setOverrideWidth] = useState<string | undefined>();

  const inputs = useSelector((state: RootState) => state.operations.inputParameters[selectedNode]);

  const pinnedNodeData = usePanelNodeData(pinnedNode);
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
      dispatch(setPinnedNode({ nodeId }));
    },
    [dispatch]
  );

  const handleCommentMenuClick = useCallback(
    (nodeId: string): void => {
      const nodeData = nodeId === pinnedNode ? pinnedNodeData : selectedNodeData;
      const comment = nodeData?.comment;
      const showCommentBox = !isNullOrUndefined(comment);
      dispatch(
        setNodeDescription({
          nodeId,
          description: showCommentBox ? undefined : '',
        })
      );
    },
    [dispatch, pinnedNode, pinnedNodeData, selectedNodeData]
  );

  const getHeaderMenuItems = useCallback(
    (nodeId: string): JSX.Element[] => {
      const nodeData = nodeId === pinnedNode ? pinnedNodeData : selectedNodeData;
      const comment = nodeData?.comment;

      // Removing the 'add a note' button for subgraph nodes
      const isSubgraphContainer = nodeData?.subgraphType === SUBGRAPH_TYPES['SWITCH_CASE'];
      const headerMenuItems: JSX.Element[] = [];
      if (!isSubgraphContainer) {
        headerMenuItems.push(
          <CommentMenuItem key={'comment'} onClick={() => handleCommentMenuClick(nodeId)} hasComment={!isNullOrUndefined(comment)} />
        );
      }
      if (nodeId !== pinnedNode) {
        headerMenuItems.push(<PinMenuItem key={'pin'} nodeId={selectedNode} onClick={() => handlePinClick(nodeId)} />);
      }
      headerMenuItems.push(<DeleteMenuItem key={'delete'} onClick={() => handleDeleteClick(nodeId)} />);
      return headerMenuItems;
    },
    [handleCommentMenuClick, handleDeleteClick, handlePinClick, pinnedNode, pinnedNodeData, selectedNode, selectedNodeData]
  );

  const onTitleChange = (originalId: string, newId: string): { valid: boolean; oldValue?: string } => {
    const isValid = isOperationNameValid(originalId, newId, isTriggerNode, nodesMetadata, idReplacements);
    return { valid: isValid, oldValue: isValid ? newId : originalId };
  };

  const handleTitleUpdate = (originalId: string, newId: string) => {
    dispatch(replaceId({ originalId, newId }));
  };

  // if is customcode file, on blur title,
  // delete the existing custom code file name and upload the new file with updated name
  const onTitleBlur = (prevTitle: string) => {
    const parameter = getParameterFromName(inputs, constants.DEFAULT_CUSTOM_CODE_INPUT);
    if (parameter && isCustomCode(parameter?.editor, parameter?.editorOptions?.language)) {
      const newFileName = getCustomCodeFileName(selectedNode, inputs, idReplacements);
      const [, fileExtension] = splitFileName(newFileName);
      const oldFileName = replaceWhiteSpaceWithUnderscore(prevTitle) + fileExtension;
      if (newFileName === oldFileName) {
        return;
      }
      // update the view model with the latest file name
      dispatch(
        updateParameterEditorViewModel({
          nodeId: selectedNode,
          groupId: ParameterGroupKeys.DEFAULT,
          parameterId: parameter.id,
          editorViewModel: {
            ...(parameter.editorViewModel ?? {}),
            customCodeData: {
              ...(parameter.editorViewModel?.customCodeData ?? {}),
              fileName: newFileName,
            },
          },
        })
      );

      dispatch(
        renameCustomCode({
          nodeId: selectedNode,
          newFileName,
          oldFileName,
        })
      );
    }
  };

  const onCommentChange = (nodeId: string, newDescription?: string) => {
    dispatch(setNodeDescription({ nodeId, description: newDescription }));
  };

  const togglePanel = (): void => (collapsed ? expand() : collapse());
  const dismissPanel = () => dispatch(clearPanel());

  const unpinAction = () => dispatch(setPinnedNode({ nodeId: '' }));

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

  const getChildWorkflowIdFromInputs = (inputs: any): string | undefined => {
    if (!isNullOrEmpty(inputs)) {
      const workflow = getObjectPropertyValue(inputs, ['host', 'value', 'workflow']);
      if (!isNullOrEmpty(workflow)) {
        return workflow.id;
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
  const stateHistoryItemIndex = useStateHistoryItemIndex();

  return (
    <PanelContainer
      key={stateHistoryItemIndex}
      {...commonPanelProps}
      noNodeSelected={!selectedNode}
      panelScope={PanelScope.CardLevel}
      suppressDefaultNodeSelectFunctionality={suppressDefaultNodeSelectFunctionality}
      node={selectedNodeData}
      nodeHeaderItems={getHeaderMenuItems(selectedNode)}
      pinnedNode={pinnedNodeData}
      pinnedNodeHeaderItems={getHeaderMenuItems(pinnedNode)}
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
              const validationErrors = validateParameter(parameter, parameter.value);
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
      trackEvent={handleTrackEvent}
      onCommentChange={onCommentChange}
      onTitleChange={onTitleChange}
      onTitleBlur={onTitleBlur}
      handleTitleUpdate={handleTitleUpdate}
      setOverrideWidth={setOverrideWidth}
    />
  );
};

// TODO: 12798935 Analytics (event logging)
// eslint-disable-next-line @typescript-eslint/no-empty-function
const handleTrackEvent = (_data: PageActionTelemetryData): void => {};
