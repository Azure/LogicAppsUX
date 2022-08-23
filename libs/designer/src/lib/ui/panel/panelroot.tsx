import constants from '../../common/constants';
import { useMonitoringView, useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import {
  useIsDiscovery,
  useIsPanelCollapsed,
  useRegisteredPanelTabs,
  useSelectedNodeId,
  useSelectedPanelTabName,
  useVisiblePanelTabs,
} from '../../core/state/panel/panelSelectors';
import {
  collapsePanel,
  expandPanel,
  isolateTab,
  registerPanelTabs,
  selectPanelTab,
  setTabVisibility,
  showDefaultTabs,
} from '../../core/state/panel/panelSlice';
import { useIconUri, useOperationInfo } from '../../core/state/selectors/actionMetadataSelector';
import { useNodeDescription, useNodeMetadata } from '../../core/state/workflow/workflowSelectors';
import { setNodeDescription } from '../../core/state/workflow/workflowSlice';
import { aboutTab } from './panelTabs/aboutTab';
import { codeViewTab } from './panelTabs/codeViewTab';
import { createConnectionTab } from './panelTabs/createConnectionTab';
import { monitoringTab } from './panelTabs/monitoringTab';
import { parametersTab } from './panelTabs/parametersTab';
import { scratchTab } from './panelTabs/scratchTab';
import { selectConnectionTab } from './panelTabs/selectConnectionTab';
import { SettingsTab } from './panelTabs/settingsTab';
import { RecommendationPanelContext } from './recommendation/recommendationPanelContext';
import { isNullOrUndefined, SUBGRAPH_TYPES } from '@microsoft-logic-apps/utils';
import type { MenuItemOption, PageActionTelemetryData } from '@microsoft/designer-ui';
import { MenuItemType, PanelContainer, PanelHeaderControlType, PanelLocation, PanelScope, PanelSize } from '@microsoft/designer-ui';
import React, { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

export const PanelRoot = (): JSX.Element => {
  const intl = useIntl();
  const dispatch = useDispatch();

  const readOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();

  const collapsed = useIsPanelCollapsed();
  const selectedNode = useSelectedNodeId();
  const isDiscovery = useIsDiscovery();

  const [width, setWidth] = useState(PanelSize.Auto);

  const registeredTabs = useRegisteredPanelTabs();
  const visibleTabs = useVisiblePanelTabs();
  const selectedPanelTab = useSelectedPanelTabName();

  const comment = useNodeDescription(selectedNode);
  const operationInfo = useOperationInfo(selectedNode);
  const iconUriResult = useIconUri(operationInfo);
  const nodeMetaData = useNodeMetadata(selectedNode);
  let showCommentBox = !isNullOrUndefined(comment);

  useEffect(() => {
    const tabs = [monitoringTab, parametersTab, aboutTab, codeViewTab, SettingsTab, scratchTab, createConnectionTab, selectConnectionTab];
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
  }, [dispatch, isMonitoringView]);

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
    } else {
      dispatch(showDefaultTabs());
    }
    dispatch(
      setTabVisibility({
        tabName: constants.PANEL_TAB_NAMES.MONITORING,
        visible: isMonitoringView,
      })
    );
  }, [dispatch, selectedNode, nodeMetaData, isMonitoringView]);

  useEffect(() => {
    dispatch(
      setTabVisibility({
        tabName: constants.PANEL_TAB_NAMES.PARAMETERS,
        visible: isMonitoringView || operationInfo?.type !== 'Scope',
      })
    );
  }, [dispatch, isMonitoringView, operationInfo]);

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
    const canDelete = true;
    const disabledDeleteAction = intl.formatMessage({
      defaultMessage: 'This operation has already been deleted.',
      description: 'Text to tell users why delete is disabled',
    });

    options.push({
      key: deleteDescription,
      disabled: readOnly || !canDelete,
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

  // TODO: 12798945? onClick for delete when node store gets built
  const handleDelete = (): void => {
    // TODO: 12798935 Analytics (event logging)
  };

  const togglePanel = (): void => (!collapsed ? collapse() : expand());

  return isDiscovery ? (
    <RecommendationPanelContext isCollapsed={collapsed} toggleCollapse={togglePanel} width={width} />
  ) : (
    <PanelContainer
      cardIcon={iconUriResult.result}
      comment={comment}
      panelLocation={PanelLocation.Right}
      isCollapsed={collapsed}
      noNodeSelected={!selectedNode}
      isLoading={iconUriResult.isLoading}
      panelScope={PanelScope.CardLevel}
      panelHeaderControlType={getPanelHeaderControlType() ? PanelHeaderControlType.DISMISS_BUTTON : PanelHeaderControlType.MENU}
      panelHeaderMenu={getPanelHeaderMenu()}
      selectedTab={selectedPanelTab}
      showCommentBox={showCommentBox}
      tabs={registeredTabs}
      width={width}
      onDismissButtonClicked={handleDelete}
      readOnlyMode={readOnly}
      setSelectedTab={setSelectedTab}
      toggleCollapse={togglePanel}
      trackEvent={handleTrackEvent}
      onCommentChange={(value) => {
        dispatch(setNodeDescription({ nodeId: selectedNode, description: value }));
      }}
      title={selectedNode}
    />
  );
};

// TODO: 12798935 Analytics (event logging)
// eslint-disable-next-line @typescript-eslint/no-empty-function
const handleTrackEvent = (_data: PageActionTelemetryData): void => {};
