import constants from '../../../common/constants';
import type { AppDispatch, RootState } from '../../../core';
import {
  clearPanel,
  collapsePanel,
  updateParameterValidation,
  useNodeDisplayName,
  useNodeMetadata,
  useSelectedNodeId,
  validateParameter,
} from '../../../core';
import { renameCustomCode } from '../../../core/state/customcode/customcodeSlice';
import { useReadOnly, useSuppressDefaultNodeSelectFunctionality } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { setShowDeleteModalNodeId } from '../../../core/state/designerView/designerViewSlice';
import { ErrorLevel, updateParameterEditorViewModel } from '../../../core/state/operation/operationMetadataSlice';
import { useIconUri, useOperationErrorInfo } from '../../../core/state/operation/operationSelector';
import { useIsPanelCollapsed, useSelectedPanelTabId } from '../../../core/state/panel/panelSelectors';
import { expandPanel, selectPanelTab, updatePanelLocation } from '../../../core/state/panel/panelSlice';
import { useOperationQuery } from '../../../core/state/selectors/actionMetadataSelector';
import { useNodeDescription, useRunData, useRunInstance } from '../../../core/state/workflow/workflowSelectors';
import { replaceId, setNodeDescription } from '../../../core/state/workflow/workflowSlice';
import { isOperationNameValid, isRootNodeInGraph } from '../../../core/utils/graph';
import { ParameterGroupKeys, getCustomCodeFileName, getParameterFromName } from '../../../core/utils/parameters/helper';
import { CommentMenuItem } from '../../menuItems/commentMenuItem';
import { DeleteMenuItem } from '../../menuItems/deleteMenuItem';
import { usePanelTabs } from './usePanelTabs';
import type { CommonPanelProps, PageActionTelemetryData } from '@microsoft/designer-ui';
import { PanelContainer, PanelScope, PanelSize, isCustomCode } from '@microsoft/designer-ui';
import {
  WorkflowService,
  SUBGRAPH_TYPES,
  isNullOrUndefined,
  replaceWhiteSpaceWithUnderscore,
  splitFileName,
} from '@microsoft/logic-apps-shared';
import type { ReactElement } from 'react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export const NodeDetailsPanel = (props: CommonPanelProps): JSX.Element => {
  const { panelLocation } = props;

  const dispatch = useDispatch<AppDispatch>();

  const readOnly = useReadOnly();
  const selectedNode = useSelectedNodeId();
  const selectedTab = useSelectedPanelTabId();
  const collapsed = useIsPanelCollapsed();

  const panelTabs = usePanelTabs({ nodeId: selectedNode });

  const runData = useRunData(selectedNode);
  const { isTriggerNode, nodesMetadata, idReplacements } = useSelector((state: RootState) => ({
    isTriggerNode: isRootNodeInGraph(selectedNode, 'root', state.workflow.nodesMetadata),
    nodesMetadata: state.workflow.nodesMetadata,
    idReplacements: state.workflow.idReplacements,
  }));
  const selectedNodeDisplayName = useNodeDisplayName(selectedNode);

  const [width, setWidth] = useState<string>(PanelSize.Auto);

  const inputs = useSelector((state: RootState) => state.operations.inputParameters[selectedNode]);
  const comment = useNodeDescription(selectedNode);
  const iconUri = useIconUri(selectedNode);
  const nodeMetaData = useNodeMetadata(selectedNode);
  let showCommentBox = !isNullOrUndefined(comment);
  const errorInfo = useOperationErrorInfo(selectedNode);

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
    dispatch(setShowDeleteModalNodeId(selectedNode));
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

  const opQuery = useOperationQuery(selectedNode);

  const isLoading = useMemo(() => {
    if (nodeMetaData?.subgraphType) {
      return false;
    }
    return opQuery.isLoading;
  }, [nodeMetaData?.subgraphType, opQuery.isLoading]);

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
      cardIcon={iconUri}
      comment={comment}
      noNodeSelected={!selectedNode}
      isError={errorInfo?.level === ErrorLevel.Critical || opQuery?.isError}
      errorMessage={errorInfo?.message}
      isLoading={isLoading}
      panelScope={PanelScope.CardLevel}
      suppressDefaultNodeSelectFunctionality={suppressDefaultNodeSelectFunctionality}
      headerMenuItems={headerMenuItems}
      showCommentBox={showCommentBox}
      tabs={panelTabs}
      selectedTab={selectedTab}
      selectTab={(tabId: string) => {
        dispatch(selectPanelTab(tabId));
      }}
      nodeId={selectedNode}
      readOnlyMode={readOnly}
      canResubmit={runData?.canResubmit ?? false}
      resubmitOperation={resubmitClick}
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
      title={selectedNodeDisplayName}
      onTitleChange={onTitleChange}
      onTitleBlur={onTitleBlur}
      setCurrWidth={setWidth}
    />
  );
};

// TODO: 12798935 Analytics (event logging)
// eslint-disable-next-line @typescript-eslint/no-empty-function
const handleTrackEvent = (_data: PageActionTelemetryData): void => {};
