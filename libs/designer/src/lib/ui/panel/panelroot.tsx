import constants from '../../common/constants';
import { useMonitoringView, useReadOnly } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useRegisteredPanelTabs, useSelectedPanelTabName, useVisiblePanelTabs } from '../../core/state/panel/panelSelectors';
import { collapsePanel, expandPanel, hideAllTabs, registerPanelTabs, selectPanelTab, showAllTabs } from '../../core/state/panel/panelSlice';
import { useIconUri, useNodeDescription, useNodeMetadata, useOperationInfo } from '../../core/state/selectors/actionMetadataSelector';
import { setNodeDescription } from '../../core/state/workflow/workflowSlice';
import type { RootState } from '../../core/store';
import { aboutTab } from './panelTabs/aboutTab';
import { codeViewTab } from './panelTabs/codeViewTab';
import { monitoringTab } from './panelTabs/monitoringTab';
import { parametersTab } from './panelTabs/parametersTab';
import { scratchTab } from './panelTabs/scratchTab';
import { SettingsTab } from './panelTabs/settingsTab';
import { RecommendationPanelContext } from './recommendation/recommendationPanelContext';
import { isNullOrUndefined, SUBGRAPH_TYPES } from '@microsoft-logic-apps/utils';
import type { MenuItemOption, PageActionTelemetryData } from '@microsoft/designer-ui';
import { MenuItemType, PanelContainer, PanelHeaderControlType, PanelLocation, PanelScope, PanelSize } from '@microsoft/designer-ui';
import React, { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export const PanelRoot = (): JSX.Element => {
  const intl = useIntl();
  const dispatch = useDispatch();

  const readOnly = useReadOnly();
  const isMonitoringView = useMonitoringView();

  const { collapsed, selectedNode, isDiscovery } = useSelector((state: RootState) => {
    return state.panel;
  });

  const [width, setWidth] = useState(PanelSize.Auto);

  const registeredTabs = useRegisteredPanelTabs();
  const visibleTabs = useVisiblePanelTabs();
  const selectedPanelTab = useSelectedPanelTabName();

  const comment = useNodeDescription(selectedNode);
  const operationInfo = useOperationInfo(selectedNode);
  const iconUriResult = useIconUri(operationInfo);
  const nodeMetaData = useNodeMetadata(selectedNode);
  const showCommentBox = !isNullOrUndefined(comment);

  useEffect(() => {
    dispatch(
      registerPanelTabs([{ ...monitoringTab, visible: !!isMonitoringView }, parametersTab, aboutTab, codeViewTab, SettingsTab, scratchTab])
    );
  }, [dispatch, readOnly, isMonitoringView]);

  useEffect(() => {
    if (!visibleTabs?.map((tab) => tab.name.toLowerCase())?.includes(selectedPanelTab ?? ''))
      dispatch(selectPanelTab(visibleTabs[0]?.name.toLowerCase()));
  }, [dispatch, visibleTabs, selectedPanelTab]);

  const setSelectedTab = (tabName: string | undefined) => {
    dispatch(selectPanelTab(tabName));
  };

  useEffect(() => {
    if (nodeMetaData && nodeMetaData.subgraphType === SUBGRAPH_TYPES.SWITCH_CASE) {
      dispatch(hideAllTabs({ exclude: [constants.PANEL_TAB_NAMES.MONITORING, constants.PANEL_TAB_NAMES.PARAMETERS] }));
    } else {
      dispatch(showAllTabs({ exclude: [constants.PANEL_TAB_NAMES.MONITORING] }));
    }
  }, [dispatch, selectedNode, nodeMetaData]);

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
    if (showCommentBox) {
      dispatch(setNodeDescription({ nodeId: selectedNode }));
    } else {
      dispatch(setNodeDescription({ nodeId: selectedNode, description: '' }));
    }
  };

  // TODO: 12798945? onClick for delete when node store gets built
  const handleDelete = (): void => {
    // TODO: 12798935 Analytics (event logging)
  };

  const togglePanel = (): void => {
    if (!collapsed) {
      collapse();
    } else {
      expand();
    }
  };

  return isDiscovery ? (
    <RecommendationPanelContext isCollapsed={collapsed} toggleCollapse={togglePanel} width={width}></RecommendationPanelContext>
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
