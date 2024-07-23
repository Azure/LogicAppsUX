import constants from '../../../common/constants';
import type { AppDispatch, RootState } from '../../../core';
import { clearPanel, collapsePanel, updateParameterValidation, validateParameter } from '../../../core';
import { renameCustomCode } from '../../../core/state/customcode/customcodeSlice';
import { useReadOnly, useSuppressDefaultNodeSelectFunctionality } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { setShowDeleteModalNodeId } from '../../../core/state/designerView/designerViewSlice';
import { updateParameterEditorViewModel } from '../../../core/state/operation/operationMetadataSlice';
import { expandPanel, updatePanelLocation } from '../../../core/state/panel/panelSlice';
import {
  useIsPanelCollapsed,
  useOperationPanelPinnedNodeId,
  useOperationPanelSelectedNodeId,
} from '../../../core/state/panelV2/panelSelectors';
import { setPinnedNode } from '../../../core/state/panelV2/panelSlice';
import { useRunData, useRunInstance } from '../../../core/state/workflow/workflowSelectors';
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
  isNullOrUndefined,
  replaceWhiteSpaceWithUnderscore,
  splitFileName,
  SUBGRAPH_TYPES,
  WorkflowService,
} from '@microsoft/logic-apps-shared';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export const NodeDetailsPanel = (props: CommonPanelProps): JSX.Element => {
  const { panelLocation } = props;

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
          ...(showCommentBox && { description: '' }),
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
        headerMenuItems.push(<CommentMenuItem key={'comment'} onClick={() => handleCommentMenuClick(nodeId)} hasComment={!!comment} />);
      }
      if (nodeId !== pinnedNode) {
        headerMenuItems.push(<PinMenuItem key={'pin'} nodeId={selectedNode} onClick={() => handlePinClick(nodeId)} />);
      }
      headerMenuItems.push(<DeleteMenuItem key={'delete'} onClick={() => handleDeleteClick(nodeId)} />);
      return headerMenuItems;
    },
    [handleCommentMenuClick, handleDeleteClick, handlePinClick, pinnedNode, pinnedNodeData, selectedNode, selectedNodeData]
  );

  const onTitleChange = (newId: string): { valid: boolean; oldValue?: string } => {
    const isValid = isOperationNameValid(selectedNode, newId, isTriggerNode, nodesMetadata, idReplacements);
    dispatch(replaceId({ originalId: selectedNode, newId }));

    return { valid: isValid, oldValue: isValid ? newId : selectedNode };
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

  const onCommentChange = (newDescription?: string) => {
    dispatch(setNodeDescription({ nodeId: selectedNode, description: newDescription }));
  };

  const togglePanel = (): void => (collapsed ? expand() : collapse());
  const dismissPanel = () => dispatch(clearPanel());

  const unpinAction = () => dispatch(setPinnedNode({ nodeId: '' }));

  const runInstance = useRunInstance();

  const resubmitClick = useCallback(() => {
    if (!runInstance) {
      return;
    }
    WorkflowService().resubmitWorkflow?.(runInstance?.name ?? '', [selectedNode]);
    dispatch(clearPanel());
  }, [dispatch, runInstance, selectedNode]);

  const layerProps = {
    hostId: 'msla-layer-host',
    eventBubblingEnabled: true,
  };

  const commonPanelProps: CommonPanelProps = {
    isCollapsed: collapsed,
    toggleCollapse: dismissPanel,
    overrideWidth,
    layerProps,
    panelLocation,
    isResizeable: props.isResizeable,
  };

  return (
    <PanelContainer
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
      overrideWidth={overrideWidth}
      setOverrideWidth={setOverrideWidth}
    />
  );
};

// TODO: 12798935 Analytics (event logging)
// eslint-disable-next-line @typescript-eslint/no-empty-function
const handleTrackEvent = (_data: PageActionTelemetryData): void => {};
