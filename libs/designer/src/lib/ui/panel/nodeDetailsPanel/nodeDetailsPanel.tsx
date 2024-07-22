import constants from '../../../common/constants';
import type { AppDispatch, RootState } from '../../../core';
import { clearPanel, collapsePanel, updateParameterValidation, useNodeMetadata, useSelectedNodeId, validateParameter } from '../../../core';
import { renameCustomCode } from '../../../core/state/customcode/customcodeSlice';
import { useReadOnly, useSuppressDefaultNodeSelectFunctionality } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { setShowDeleteModal } from '../../../core/state/designerView/designerViewSlice';
import { updateParameterEditorViewModel } from '../../../core/state/operation/operationMetadataSlice';
import { useIsPanelCollapsed } from '../../../core/state/panel/panelSelectors';
import { expandPanel, setPinnedNodeId, setSelectedNodeId, updatePanelLocation } from '../../../core/state/panel/panelSlice';
import { usePinnedNodeId } from '../../../core/state/panel/panelV2Selectors';
import { useNodeDescription, useRunData, useRunInstance } from '../../../core/state/workflow/workflowSelectors';
import { replaceId, setNodeDescription } from '../../../core/state/workflow/workflowSlice';
import { isOperationNameValid, isRootNodeInGraph } from '../../../core/utils/graph';
import { getCustomCodeFileName, getParameterFromName, ParameterGroupKeys } from '../../../core/utils/parameters/helper';
import { CommentMenuItem } from '../../menuItems/commentMenuItem';
import { DeleteMenuItem } from '../../menuItems/deleteMenuItem';
import { usePanelNodeData } from './usePanelNodeData';
import type { CommonPanelProps, PageActionTelemetryData } from '@microsoft/designer-ui';
import { isCustomCode, PanelContainer, PanelScope, PanelSize } from '@microsoft/designer-ui';
import {
  isNullOrUndefined,
  replaceWhiteSpaceWithUnderscore,
  splitFileName,
  SUBGRAPH_TYPES,
  WorkflowService,
} from '@microsoft/logic-apps-shared';
import type React from 'react';
import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export const NodeDetailsPanel = (props: CommonPanelProps): JSX.Element => {
  const { panelLocation } = props;

  const dispatch = useDispatch<AppDispatch>();

  const readOnly = useReadOnly();
  const collapsed = useIsPanelCollapsed();

  const pinnedNode = usePinnedNodeId();
  const selectedNode = useSelectedNodeId();

  const runData = useRunData(selectedNode);
  const { isTriggerNode, nodesMetadata, idReplacements } = useSelector((state: RootState) => ({
    isTriggerNode: isRootNodeInGraph(selectedNode, 'root', state.workflow.nodesMetadata),
    nodesMetadata: state.workflow.nodesMetadata,
    idReplacements: state.workflow.idReplacements,
  }));

  const [width, setWidth] = useState<string>(PanelSize.Auto);

  const inputs = useSelector((state: RootState) => state.operations.inputParameters[selectedNode]);
  const comment = useNodeDescription(selectedNode);
  const nodeMetaData = useNodeMetadata(selectedNode);
  let showCommentBox = !isNullOrUndefined(comment);

  const pinnedNodeData = usePanelNodeData(pinnedNode);
  const selectedNodeData = usePanelNodeData(selectedNode);

  const suppressDefaultNodeSelectFunctionality = useSuppressDefaultNodeSelectFunctionality();

  useEffect(() => {
    collapsed ? setWidth(PanelSize.Auto) : setWidth(PanelSize.Medium);
  }, [collapsed]);

  useEffect(() => {
    dispatch(updatePanelLocation(panelLocation));
  }, [dispatch, panelLocation]);

  const collapse = useCallback(() => {
    dispatch(collapsePanel());
  }, [dispatch]);

  const expand = useCallback(() => {
    dispatch(expandPanel());
  }, [dispatch]);

  const deleteClick = useCallback(() => {
    dispatch(setSelectedNodeId(selectedNode));
    dispatch(setShowDeleteModal(true));
  }, [dispatch, selectedNode]);

  const handleCommentMenuClick = (_: React.MouseEvent<HTMLElement>): void => {
    showCommentBox = !showCommentBox;
    dispatch(
      setNodeDescription({
        nodeId: selectedNode,
        ...(showCommentBox && { description: '' }),
      })
    );
  };

  // Removing the 'add a note' button for subgraph nodes
  const isSubgraphContainer = nodeMetaData?.subgraphType === SUBGRAPH_TYPES.SWITCH_CASE;
  const headerMenuItems: ReactElement[] = [];
  if (!isSubgraphContainer) {
    headerMenuItems.push(<CommentMenuItem key={'comment'} onClick={handleCommentMenuClick} hasComment={showCommentBox} />);
  }
  headerMenuItems.push(<DeleteMenuItem key={'delete'} onClick={deleteClick} />);

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

  const unpinAction = () => dispatch(setPinnedNodeId(''));

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
    width,
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
      headerMenuItems={headerMenuItems}
      showCommentBox={showCommentBox}
      node={selectedNodeData}
      pinnedNode={pinnedNodeData}
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
      setCurrWidth={setWidth}
    />
  );
};

// TODO: 12798935 Analytics (event logging)
// eslint-disable-next-line @typescript-eslint/no-empty-function
const handleTrackEvent = (_data: PageActionTelemetryData): void => {};
