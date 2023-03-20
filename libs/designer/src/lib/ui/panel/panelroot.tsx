import constants from '../../common/constants';
import type { AppDispatch, RootState } from '../../core';
import { deleteOperation } from '../../core/actions/bjsworkflow/delete';
import { useMonitoringView, useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { updateParameterValidation } from '../../core/state/operation/operationMetadataSlice';
import { useParameterValidationErrors } from '../../core/state/operation/operationSelector';
import {
  useIsDiscovery,
  useIsPanelCollapsed,
  useIsWorkflowParametersMode,
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
} from '../../core/state/panel/panelSlice';
import { useIconUri, useOperationInfo, useOperationQuery } from '../../core/state/selectors/actionMetadataSelector';
import { useHasSchema } from '../../core/state/staticresultschema/staitcresultschemaselector';
import { useNodeDescription, useNodeDisplayName, useNodeMetadata } from '../../core/state/workflow/workflowSelectors';
import { replaceId, setNodeDescription } from '../../core/state/workflow/workflowSlice';
import { isRootNodeInGraph } from '../../core/utils/graph';
import { validateParameter } from '../../core/utils/parameters/helper';
import { aboutTab } from './panelTabs/aboutTab';
import { codeViewTab } from './panelTabs/codeViewTab';
import { createConnectionTab } from './panelTabs/createConnectionTab';
import { loadingTab } from './panelTabs/loadingTab';
import { monitoringTab } from './panelTabs/monitoringTab/monitoringTab';
import { parametersTab } from './panelTabs/parametersTab';
import { scratchTab } from './panelTabs/scratchTab';
import { selectConnectionTab } from './panelTabs/selectConnectionTab';
import { settingsTab } from './panelTabs/settingsTab';
import { testingTab } from './panelTabs/testingTab';
import { RecommendationPanelContext } from './recommendation/recommendationPanelContext';
import { WorkflowParametersPanel } from './workflowparameterspanel';
import type { MenuItemOption, PageActionTelemetryData } from '@microsoft/designer-ui';
import { MenuItemType, PanelContainer, PanelHeaderControlType, PanelLocation, PanelScope, PanelSize } from '@microsoft/designer-ui';
import { isNullOrUndefined, SUBGRAPH_TYPES } from '@microsoft/utils-logic-apps';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export const PanelRoot = (): JSX.Element => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const readOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();

  const collapsed = useIsPanelCollapsed();
  const selectedNode = useSelectedNodeId();
  const isTriggerNode = useSelector((state: RootState) => isRootNodeInGraph(selectedNode, 'root', state.workflow.nodesMetadata));
  const selectedNodeDisplayName = useNodeDisplayName(selectedNode);
  const isDiscovery = useIsDiscovery();
  const isWorkflowParameters = useIsWorkflowParametersMode();

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

  useEffect(() => {
    const tabs = [
      monitoringTab,
      parametersTab,
      settingsTab,
      codeViewTab,
      testingTab,
      createConnectionTab,
      selectConnectionTab,
      aboutTab,
      loadingTab,
    ];
    if (process.env.NODE_ENV !== 'production') {
      tabs.push(scratchTab);
    }
    dispatch(registerPanelTabs(tabs));
  }, [dispatch]);

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
        visible: !isTriggerNode && hasSchema,
      })
    );
  }, [dispatch, hasSchema, isTriggerNode, selectedNode]);

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
    const hasErrors = parameterValidationErrors?.length > 0;
    dispatch(setTabError({ tabName: 'parameters', hasErrors, nodeId: selectedNode }));
  }, [dispatch, parameterValidationErrors?.length, selectedNode]);

  useEffect(() => {
    collapsed ? setWidth(PanelSize.Auto) : setWidth(PanelSize.Medium);
  }, [collapsed]);

  const collapse = useCallback(() => {
    dispatch(collapsePanel());
  }, [dispatch]);

  const expand = useCallback(() => {
    dispatch(expandPanel());
  }, [dispatch]);

  const getPanelHeaderControlType = (): boolean => {
    // TODO: 13067650
    return isDiscovery;
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
      defaultMessage: 'Comment',
      description: 'Comment text',
    });
    const disabledCommentAction = intl.formatMessage({
      defaultMessage: 'Comments can only be added while editing the inputs of a step.',
      description: 'Text to tell users why a comment is disabled',
    });
    const commentAdd = intl.formatMessage({
      defaultMessage: 'Add a comment',
      description: 'Text to tell users to click to add comments',
    });
    const commentDelete = intl.formatMessage({
      defaultMessage: 'Delete comment',
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
      onClick: handleDelete,
    });
    return options;
  };

  const handleCommentMenuClick = (_: React.MouseEvent<HTMLElement>): void => {
    showCommentBox = !showCommentBox;
    dispatch(setNodeDescription({ nodeId: selectedNode, ...(showCommentBox && { description: '' }) }));
  };

  const onTitleChange = (newId: string) => {
    dispatch(replaceId({ originalId: selectedNode, newId }));
  };

  const handleDelete = (): void => {
    dispatch(deleteOperation({ nodeId: selectedNode, isTrigger: isTriggerNode }));
    // TODO: 12798935 Analytics (event logging)
  };

  const togglePanel = (): void => (!collapsed ? collapse() : expand());
  const dismissPanel = () => dispatch(clearPanel());

  const opQuery = useOperationQuery(selectedNode);

  const isLoading = useMemo(() => {
    if (nodeMetaData?.subgraphType) return false;
    return opQuery.isLoading;
  }, [nodeMetaData?.subgraphType, opQuery.isLoading]);

  const layerProps = {
    hostId: 'msla-designer-canvas',
    styles: { root: { zIndex: 999998 } },
  };

  return isWorkflowParameters ? (
    <WorkflowParametersPanel isCollapsed={collapsed} toggleCollapse={dismissPanel} width={width} layerProps={layerProps} />
  ) : isDiscovery ? (
    <RecommendationPanelContext
      isCollapsed={collapsed}
      toggleCollapse={dismissPanel}
      width={width}
      key={selectedNode}
      layerProps={layerProps}
    />
  ) : (
    <PanelContainer
      cardIcon={iconUri}
      comment={comment}
      panelLocation={PanelLocation.Right}
      isCollapsed={collapsed}
      noNodeSelected={!selectedNode}
      isError={opQuery?.isError}
      isLoading={isLoading}
      panelScope={PanelScope.CardLevel}
      panelHeaderControlType={getPanelHeaderControlType() ? PanelHeaderControlType.DISMISS_BUTTON : PanelHeaderControlType.MENU}
      panelHeaderMenu={getPanelHeaderMenu()}
      selectedTab={selectedPanelTab}
      showCommentBox={showCommentBox}
      tabs={registeredTabs}
      nodeId={selectedNode}
      width={width}
      onDismissButtonClicked={handleDelete}
      readOnlyMode={readOnly}
      setSelectedTab={setSelectedTab}
      toggleCollapse={() => {
        //only run validation when collapsing the panel
        if (!collapsed) {
          Object.keys(inputs.parameterGroups).forEach((parameterGroup) => {
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
      onCommentChange={(value) => {
        dispatch(setNodeDescription({ nodeId: selectedNode, description: value }));
      }}
      title={selectedNodeDisplayName}
      onTitleChange={onTitleChange}
      layerProps={layerProps}
    />
  );
};

// TODO: 12798935 Analytics (event logging)
// eslint-disable-next-line @typescript-eslint/no-empty-function
const handleTrackEvent = (_data: PageActionTelemetryData): void => {};
