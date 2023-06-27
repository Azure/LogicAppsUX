import constants from '../../common/constants';
import type { AppDispatch, RootState } from '../../core';
import { deleteGraphNode, deleteOperation } from '../../core/actions/bjsworkflow/delete';
import type { WorkflowNode } from '../../core/parsers/models/workflowNode';
import { useIsXrmConnectionReferenceMode, useMonitoringView, useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { ErrorLevel, updateParameterValidation } from '../../core/state/operation/operationMetadataSlice';
import { useOperationErrorInfo, useParameterValidationErrors } from '../../core/state/operation/operationSelector';
import {
  useCurrentPanelModePanelMode,
  useIsPanelCollapsed,
  useRegisteredPanelTabs,
  useSelectedNodeId,
  useSelectedPanelTabName,
  useVisiblePanelTabs,
} from '../../core/state/panel/panelSelectors';
import {
  clearPanel,
  collapsePanel,
  expandPanel,
  isolateTab,
  registerPanelTabs,
  selectPanelTab,
  setTabError,
  setTabVisibility,
  updatePanelLocation,
} from '../../core/state/panel/panelSlice';
import { useIconUri, useOperationInfo, useOperationQuery } from '../../core/state/selectors/actionMetadataSelector';
import { useHasSchema } from '../../core/state/staticresultschema/staitcresultsSelector';
import { useNodeDescription, useNodeDisplayName, useNodeMetadata, useWorkflowNode } from '../../core/state/workflow/workflowSelectors';
import { deleteSwitchCase, replaceId, setNodeDescription } from '../../core/state/workflow/workflowSlice';
import { isOperationNameValid, isRootNodeInGraph } from '../../core/utils/graph';
import { validateParameter } from '../../core/utils/parameters/helper';
import { NodeSearchPanel } from './nodeSearchPanel';
import { aboutTab } from './panelTabs/aboutTab';
import { codeViewTab } from './panelTabs/codeViewTab';
import { getCreateConnectionTab } from './panelTabs/createConnectionTab';
import { loadingTab } from './panelTabs/loadingTab';
import { monitoringTab } from './panelTabs/monitoringTab/monitoringTab';
import { parametersTab } from './panelTabs/parametersTab';
import { monitorRetryTab } from './panelTabs/retryTab';
import { scratchTab } from './panelTabs/scratchTab';
import { getSelectConnectionTab } from './panelTabs/selectConnectionTab';
import { settingsTab } from './panelTabs/settingsTab';
import { testingTab } from './panelTabs/testingTab';
import { RecommendationPanelContext } from './recommendation/recommendationPanelContext';
import { WorkflowParametersPanel } from './workflowparameterspanel';
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
import { isNullOrUndefined, isScopeOperation, isSubGraphNode, SUBGRAPH_TYPES } from '@microsoft/utils-logic-apps';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export interface PanelRootProps {
  panelLocation?: PanelLocation;
  displayRuntimeInfo: boolean;
}

export const PanelRoot = (props: PanelRootProps): JSX.Element => {
  const { panelLocation, displayRuntimeInfo } = props;
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const readOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();

  const collapsed = useIsPanelCollapsed();
  const selectedNode = useSelectedNodeId();
  const { isTriggerNode, nodesMetadata, idReplacements } = useSelector((state: RootState) => ({
    isTriggerNode: isRootNodeInGraph(selectedNode, 'root', state.workflow.nodesMetadata),
    nodesMetadata: state.workflow.nodesMetadata,
    idReplacements: state.workflow.idReplacements,
  }));
  const selectedNodeDisplayName = useNodeDisplayName(selectedNode);
  const currentPanelMode = useCurrentPanelModePanelMode();

  const graphNode = useWorkflowNode(selectedNode) as WorkflowNode;

  const [width, setWidth] = useState(PanelSize.Auto);

  const registeredTabs = useRegisteredPanelTabs();
  const visibleTabs = useVisiblePanelTabs();
  const selectedPanelTab = useSelectedPanelTabName();
  const inputs = useSelector((state: RootState) => state.operations.inputParameters[selectedNode]);
  const comment = useNodeDescription(selectedNode);
  const iconUri = useIconUri(selectedNode);
  const nodeMetaData = useNodeMetadata(selectedNode);
  const operationInfo = useOperationInfo(selectedNode);
  let showCommentBox = !isNullOrUndefined(comment);
  const hasSchema = useHasSchema(operationInfo?.connectorId, operationInfo?.operationId);
  const isXrmConnectionReferenceMode = useIsXrmConnectionReferenceMode();
  const errorInfo = useOperationErrorInfo(selectedNode);

  const selectConnectionTabTitle = isXrmConnectionReferenceMode
    ? intl.formatMessage({
        defaultMessage: 'Select Connection Reference',
        description: 'Title for the select connection reference tab',
      })
    : intl.formatMessage({
        defaultMessage: 'Select Connection',
        description: 'Title for the select connection tab',
      });
  const createConnectionTabTitle = isXrmConnectionReferenceMode
    ? intl.formatMessage({
        defaultMessage: 'Create Connection Reference',
        description: 'Title for the create connection reference tab',
      })
    : intl.formatMessage({
        defaultMessage: 'Create Connection',
        description: 'Title for the create connection tab',
      });

  useEffect(() => {
    dispatch(updatePanelLocation(panelLocation));
  }, [dispatch, panelLocation]);

  useEffect(() => {
    const tabs = [
      monitoringTab(intl),
      parametersTab(intl),
      settingsTab(intl),
      codeViewTab(intl),
      testingTab(intl),
      aboutTab(intl),
      loadingTab(intl),
      monitorRetryTab(intl),
    ];
    if (process.env.NODE_ENV !== 'production') {
      tabs.push(scratchTab);
    }
    dispatch(registerPanelTabs(tabs));
    dispatch(clearPanel());
  }, [dispatch, intl]);

  useEffect(() => {
    const createConnectionTab = getCreateConnectionTab(createConnectionTabTitle);
    dispatch(registerPanelTabs([createConnectionTab]));
  }, [dispatch, createConnectionTabTitle]);

  useEffect(() => {
    const selectConnectionTab = getSelectConnectionTab(selectConnectionTabTitle);
    dispatch(registerPanelTabs([selectConnectionTab]));
  }, [dispatch, selectConnectionTabTitle]);

  useEffect(() => {
    dispatch(
      setTabVisibility({
        tabName: constants.PANEL_TAB_NAMES.MONITORING,
        visible: isMonitoringView,
      })
    );
    dispatch(
      setTabVisibility({
        tabName: constants.PANEL_TAB_NAMES.PARAMETERS,
        visible: !isMonitoringView,
      })
    );
  }, [dispatch, isMonitoringView]);

  useEffect(() => {
    dispatch(
      setTabVisibility({
        tabName: constants.PANEL_TAB_NAMES.MONITORING,
        visible: operationInfo?.type.toLowerCase() !== constants.NODE.TYPE.SCOPE && isMonitoringView,
      })
    );
  }, [dispatch, operationInfo, isMonitoringView]);

  useEffect(() => {
    dispatch(
      setTabVisibility({
        tabName: constants.PANEL_TAB_NAMES.TESTING,
        visible: !isTriggerNode && hasSchema && !isMonitoringView,
      })
    );
  }, [dispatch, hasSchema, isMonitoringView, isTriggerNode, selectedNode]);

  useEffect(() => {
    if (!visibleTabs?.map((tab) => tab.name.toLowerCase())?.includes(selectedPanelTab ?? ''))
      dispatch(selectPanelTab(visibleTabs[0]?.name.toLowerCase()));
  }, [dispatch, visibleTabs, selectedPanelTab]);

  const setSelectedTab = (tabName: string | undefined) => {
    dispatch(selectPanelTab(tabName));
  };

  useEffect(() => {
    if (nodeMetaData && nodeMetaData.subgraphType === SUBGRAPH_TYPES.SWITCH_CASE) {
      dispatch(isolateTab(constants.PANEL_TAB_NAMES.PARAMETERS));
    }
    dispatch(
      setTabVisibility({
        tabName: constants.PANEL_TAB_NAMES.MONITORING,
        visible: isMonitoringView,
      })
    );
  }, [dispatch, selectedNode, nodeMetaData, isMonitoringView]);

  const parameterValidationErrors = useParameterValidationErrors(selectedNode);
  useEffect(() => {
    const hasErrors = parameterValidationErrors?.length > 0 || errorInfo?.level === ErrorLevel.Connection;
    dispatch(setTabError({ tabName: 'parameters', hasErrors, nodeId: selectedNode }));
  }, [dispatch, errorInfo?.level, parameterValidationErrors?.length, selectedNode]);

  useEffect(() => {
    collapsed ? setWidth(PanelSize.Auto) : setWidth(PanelSize.Medium);
  }, [collapsed]);

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

  return currentPanelMode === 'WorkflowParameters' ? (
    <WorkflowParametersPanel {...commonPanelProps} />
  ) : currentPanelMode === 'Discovery' ? (
    <RecommendationPanelContext {...commonPanelProps} displayRuntimeInfo={displayRuntimeInfo} />
  ) : currentPanelMode === 'NodeSearch' ? (
    <NodeSearchPanel {...commonPanelProps} displayRuntimeInfo={displayRuntimeInfo} />
  ) : (
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
          //only run validation when collapsing the panel
          if (!collapsed) {
            Object.keys(inputs?.parameterGroups ?? {}).forEach((parameterGroup) => {
              inputs.parameterGroups[parameterGroup].parameters.forEach((parameter) => {
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
