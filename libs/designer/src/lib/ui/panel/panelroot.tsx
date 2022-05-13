import { collapsePanel, expandPanel } from '../../core/state/panelSlice';
import type { RootState } from '../../core/store';
import type { PanelTab } from './panelUtil';
import { registerTab, getTabs } from './panelUtil';
import { RecommendationPanelContext } from './recommendation/recommendationPanelContext';
import { aboutTab, settingsTab, codeViewTab } from './registeredtabs';
import type { MenuItemOption, PageActionTelemetryData } from '@microsoft/designer-ui';
import { MenuItemType, PanelContainer, PanelHeaderControlType } from '@microsoft/designer-ui';
import React, { useCallback, useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export interface PanelRootProps {
  cardIcon?: string;
  comment?: string;
  selectedTabId?: string;
  readOnlyMode?: boolean;
}

export const PanelRoot = ({ cardIcon, comment, selectedTabId, readOnlyMode }: PanelRootProps): JSX.Element => {
  const intl = useIntl();
  const dispatch = useDispatch();

  const { collapsed, selectedNode, isDiscovery } = useSelector((state: RootState) => {
    return state.panel;
  });

  const [showCommentBox, setShowCommentBox] = useState(Boolean(comment));
  const [currentComment, setCurrentComment] = useState(comment);
  const [selectedTab, setSelectedTab] = useState(selectedTabId);
  const [width, setWidth] = useState('auto');

  const [registeredTabs, setRegisteredTabs] = useState<Record<string, PanelTab>>({});

  useEffect(() => {
    setRegisteredTabs((currentTabs) => registerTab(aboutTab, registerTab(codeViewTab, registerTab(settingsTab, currentTabs))));
  }, []);

  useEffect(() => {
    setSelectedTab(getTabs(true, registeredTabs)[0]?.name.toLowerCase());
  }, [registeredTabs]);

  useEffect(() => {
    collapsed ? setWidth('auto') : setWidth('630px');
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
      disabled: readOnlyMode,
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
      disabled: readOnlyMode || !canDelete,
      disabledReason: disabledDeleteAction,
      iconName: 'Delete',
      title: deleteDescription,
      type: MenuItemType.Advanced,
      onClick: handleDelete,
    });
    return options;
  };

  const handleCommentMenuClick = (_: React.MouseEvent<HTMLElement>): void => {
    if (currentComment != null) {
      setCurrentComment(undefined);
      setShowCommentBox(false);
    } else {
      setCurrentComment('');
      setShowCommentBox(true);
    }
  };

  // TODO: 12798945? onClick for delete when node store gets built
  const handleDelete = (): void => {
    // TODO: 12798935 Analytics (event logging)
    console.log('Node deleted!');
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
      cardIcon={cardIcon}
      comment={currentComment}
      isRight
      isCollapsed={collapsed}
      noNodeSelected={!selectedNode}
      panelHeaderControlType={getPanelHeaderControlType() ? PanelHeaderControlType.DISMISS_BUTTON : PanelHeaderControlType.MENU}
      panelHeaderMenu={getPanelHeaderMenu()}
      selectedTab={selectedTab}
      showCommentBox={showCommentBox}
      tabs={registeredTabs}
      width={width}
      onDismissButtonClicked={handleDelete}
      setSelectedTab={setSelectedTab}
      toggleCollapse={togglePanel}
      trackEvent={handleTrackEvent}
      title={selectedNode}
    />
  );
};

// TODO: 12798935 Analytics (event logging)
const handleTrackEvent = (data: PageActionTelemetryData): void => {
  console.log('Track Event');
};
