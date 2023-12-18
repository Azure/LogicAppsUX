import type { AppDispatch, RootState } from '../../../core';
import {
  useSelectedNodeId,
  useNodeDisplayName,
  useNodeMetadata,
  useOperationInfo,
  clearPanel,
  collapsePanel,
  validateParameter,
  updateParameterValidation,
} from '../../../core';
import { deleteGraphNode, deleteOperation } from '../../../core/actions/bjsworkflow/delete';
import type { WorkflowNode } from '../../../core/parsers/models/workflowNode';
import { useReadOnly } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { ErrorLevel } from '../../../core/state/operation/operationMetadataSlice';
import { useOperationErrorInfo, useParameterValidationErrors } from '../../../core/state/operation/operationSelector';
import {
  useIsPanelCollapsed,
  useCurrentPanelMode,
  useRegisteredPanelTabs,
  useSelectedPanelTabName,
} from '../../../core/state/panel/panelSelectors';
import { setTabError, expandPanel, selectPanelTab, updatePanelLocation } from '../../../core/state/panel/panelSlice';
import { useIconUri, useOperationQuery } from '../../../core/state/selectors/actionMetadataSelector';
import { useWorkflowNode, useNodeDescription } from '../../../core/state/workflow/workflowSelectors';
import { deleteSwitchCase, setNodeDescription, replaceId } from '../../../core/state/workflow/workflowSlice';
import { isRootNodeInGraph, isOperationNameValid } from '../../../core/utils/graph';
import type { CommonPanelProps, MenuItemOption, PageActionTelemetryData } from '@microsoft/designer-ui';
import {
  DeleteNodeModal,
  MenuItemType,
  PanelContainer,
  PanelHeaderControlType,
  PanelLocation,
  PanelScope,
  PanelSize,
} from '@microsoft/designer-ui';
import { isNullOrUndefined, isScopeOperation, isSubGraphNode } from '@microsoft/utils-logic-apps';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export const NodeDetailsPanel = (props: CommonPanelProps): JSX.Element => {
  const { panelLocation } = props;

  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const readOnly = useReadOnly();

  const collapsed = useIsPanelCollapsed();
  const selectedNode = useSelectedNodeId();
  const { isTriggerNode, nodesMetadata, idReplacements } = useSelector((state: RootState) => ({
    isTriggerNode: isRootNodeInGraph(selectedNode, 'root', state.workflow.nodesMetadata),
    nodesMetadata: state.workflow.nodesMetadata,
    idReplacements: state.workflow.idReplacements,
  }));
  const selectedNodeDisplayName = useNodeDisplayName(selectedNode);
  const currentPanelMode = useCurrentPanelMode();

  const graphNode = useWorkflowNode(selectedNode) as WorkflowNode;

  const [width, setWidth] = useState<PanelSize>(PanelSize.Auto);

  const registeredTabs = useRegisteredPanelTabs();
  const selectedPanelTab = useSelectedPanelTabName();
  const setSelectedTab = (tabName: string | undefined) => {
    dispatch(selectPanelTab(tabName));
  };
  const inputs = useSelector((state: RootState) => state.operations.inputParameters[selectedNode]);
  const comment = useNodeDescription(selectedNode);
  const iconUri = useIconUri(selectedNode);
  const nodeMetaData = useNodeMetadata(selectedNode);
  const operationInfo = useOperationInfo(selectedNode);
  let showCommentBox = !isNullOrUndefined(comment);
  const errorInfo = useOperationErrorInfo(selectedNode);

  const parameterValidationErrors = useParameterValidationErrors(selectedNode);
  useEffect(() => {
    const hasErrors = parameterValidationErrors?.length > 0 || errorInfo?.level === ErrorLevel.Connection;
    dispatch(setTabError({ tabName: 'parameters', hasErrors, nodeId: selectedNode }));
  }, [dispatch, errorInfo?.level, parameterValidationErrors?.length, selectedNode]);

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

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const handleDeleteClick = () => setShowDeleteModal(true);
  const handleDelete = () => {
    // TODO: 12798935 Analytics (event logging)
    if (operationInfo && isScopeOperation(operationInfo.type)) {
      dispatch(deleteGraphNode({ graphId: selectedNode, graphNode }));
    } else if (isSubGraphNode(graphNode.type)) {
      dispatch(deleteGraphNode({ graphId: selectedNode, graphNode: graphNode }));
      dispatch(deleteSwitchCase({ caseId: selectedNode, nodeId: nodeMetaData?.graphId ?? '' }));
    } else {
      dispatch(deleteOperation({ nodeId: selectedNode, isTrigger: isTriggerNode }));
    }
    setShowDeleteModal(false);
  };

  const getPanelHeaderControlType = (): boolean => {
    // TODO: 13067650
    return currentPanelMode === 'Discovery';
  };

  const getPanelHeaderMenu = (): MenuItemOption[] => {
    const menuOptions: MenuItemOption[] = [];
    // TODO: 13067650 Conditionals to decide when to show these menu options
    getCommentMenuItem(menuOptions);
    getDeleteMenuItem(menuOptions);
    return menuOptions;
  };

  const getCommentMenuItem = (options: MenuItemOption[]): MenuItemOption[] => {
    const commentDescription = intl.formatMessage({
      defaultMessage: 'Note',
      description: 'Note text',
    });
    const disabledCommentAction = intl.formatMessage({
      defaultMessage: "You can add notes only when you edit a step's inputs.",
      description: 'Text to tell users why notes are disabled',
    });
    const commentAdd = intl.formatMessage({
      defaultMessage: 'Add a note',
      description: 'Text to tell users to click to add comments',
    });
    const commentDelete = intl.formatMessage({
      defaultMessage: 'Delete note',
      description: 'Text to tell users to click to delete comments',
    });

    options.push({
      disabled: readOnly,
      type: MenuItemType.Advanced,
      disabledReason: disabledCommentAction,
      iconName: 'Comment',
      key: commentDescription,
      title: showCommentBox ? commentDelete : commentAdd,
      onClick: handleCommentMenuClick,
    });
    return options;
  };

  const getDeleteMenuItem = (options: MenuItemOption[]): MenuItemOption[] => {
    const deleteDescription = intl.formatMessage({
      defaultMessage: 'Delete',
      description: 'Delete text',
    });
    // TODO: 13067650 Disabled reason/description tobe implemented when panel actions gets built
    const disabledDeleteAction = intl.formatMessage({
      defaultMessage: 'This operation has already been deleted.',
      description: 'Text to tell users why delete is disabled',
    });

    options.push({
      key: deleteDescription,
      disabled: readOnly,
      disabledReason: disabledDeleteAction,
      iconName: 'Delete',
      title: deleteDescription,
      type: MenuItemType.Advanced,
      onClick: handleDeleteClick,
    });
    return options;
  };

  const handleCommentMenuClick = (_: React.MouseEvent<HTMLElement>): void => {
    showCommentBox = !showCommentBox;
    dispatch(setNodeDescription({ nodeId: selectedNode, ...(showCommentBox && { description: '' }) }));
  };

  const onTitleChange = (newId: string): { valid: boolean; oldValue?: string } => {
    const isValid = isOperationNameValid(selectedNode, newId, isTriggerNode, nodesMetadata, idReplacements);
    dispatch(replaceId({ originalId: selectedNode, newId }));

    return { valid: isValid, oldValue: isValid ? newId : selectedNode };
  };

  const onCommentChange = (newDescription?: string) => {
    dispatch(setNodeDescription({ nodeId: selectedNode, description: newDescription }));
  };

  const togglePanel = (): void => (!collapsed ? collapse() : expand());
  const dismissPanel = () => dispatch(clearPanel());

  const opQuery = useOperationQuery(selectedNode);

  const isLoading = useMemo(() => {
    if (nodeMetaData?.subgraphType) return false;
    return opQuery.isLoading;
  }, [nodeMetaData?.subgraphType, opQuery.isLoading]);

  const layerProps = {
    hostId: 'msla-layer-host',
    eventBubblingEnabled: true,
  };

  const commonPanelProps: CommonPanelProps = {
    isCollapsed: collapsed,
    toggleCollapse: dismissPanel,
    width,
    layerProps,
    panelLocation: panelLocation ?? PanelLocation.Right,
  };

  return (
    <>
      <PanelContainer
        {...commonPanelProps}
        cardIcon={iconUri}
        comment={comment}
        noNodeSelected={!selectedNode}
        isError={errorInfo?.level === ErrorLevel.Critical || opQuery?.isError}
        errorMessage={errorInfo?.message}
        isLoading={isLoading}
        panelScope={PanelScope.CardLevel}
        panelHeaderControlType={getPanelHeaderControlType() ? PanelHeaderControlType.DISMISS_BUTTON : PanelHeaderControlType.MENU}
        panelHeaderMenu={getPanelHeaderMenu()}
        selectedTab={selectedPanelTab}
        showCommentBox={showCommentBox}
        tabs={registeredTabs}
        nodeId={selectedNode}
        onDismissButtonClicked={handleDelete}
        readOnlyMode={readOnly}
        setSelectedTab={setSelectedTab}
        toggleCollapse={() => {
          // Only run validation when collapsing the panel
          if (!collapsed) {
            Object.keys(inputs?.parameterGroups ?? {}).forEach((parameterGroup) => {
              inputs.parameterGroups[parameterGroup].parameters.forEach((parameter: any) => {
                const validationErrors = validateParameter(parameter, parameter.value);
                dispatch(
                  updateParameterValidation({ nodeId: selectedNode, groupId: parameterGroup, parameterId: parameter.id, validationErrors })
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
      />
      {graphNode?.type && (
        <DeleteNodeModal
          nodeId={selectedNode}
          nodeType={graphNode.type}
          isOpen={showDeleteModal}
          onDismiss={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
};

// TODO: 12798935 Analytics (event logging)
// eslint-disable-next-line @typescript-eslint/no-empty-function
const handleTrackEvent = (_data: PageActionTelemetryData): void => {};
