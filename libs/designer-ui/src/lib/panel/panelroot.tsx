import { PanelContainer } from './';
import { PageActionTelemetryData } from '../telemetry/models';
import { useEffect, useState } from 'react';
import { workflowParametersTab, aboutTab, connectionTab } from './registeredtabs';
import { MenuItemOption, MenuItemType } from '../card/types';
import { useIntl } from 'react-intl';
export interface PanelRootProps {
  comment?: string;
  selectedTabId?: string;
  readOnlyMode?: boolean;
}

export const PanelRoot = ({ comment, selectedTabId, readOnlyMode }: PanelRootProps): JSX.Element => {
  const intl = useIntl();

  const [showCommentBox, setShowCommentBox] = useState(Boolean(comment));
  const [selectedTab, setSelectedTab] = useState(workflowParametersTab.name);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState('auto');
  useEffect(() => {
    isCollapsed ? setWidth('auto') : setWidth('630px');
  }, [isCollapsed]);

  const getPanelHeaderMenu = (): MenuItemOption[] => {
    const menuOptions: MenuItemOption[] = [];
    // TODO: Conditionals to decide when to show these menu options
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
    });
    return options;
  };

  const getDeleteMenuItem = (options: MenuItemOption[]): MenuItemOption[] => {
    const deleteDescription = intl.formatMessage({
      defaultMessage: 'Delete',
      description: 'Delete text',
    });
    // TODO: More disabled descriptions to be implemented when panel actions gets built
    const disabledDeleteAction = intl.formatMessage({
      defaultMessage: 'This operation has already been deleted.',
      description: 'Text to tell users why delete is disabled',
    });
    const canDelete = true;

    options.push({
      key: deleteDescription,
      disabled: readOnlyMode || !canDelete,
      disabledReason: disabledDeleteAction,
      iconName: 'Delete',
      title: deleteDescription,
      type: MenuItemType.Advanced,
    });
    return options;
  };
  return (
    <PanelContainer
      comment={comment}
      isRight
      isCollapsed={isCollapsed}
      noNodeSelected={false}
      panelHeaderMenu={getPanelHeaderMenu()}
      selectedTab={selectedTab}
      showCommentBox={showCommentBox}
      tabs={[workflowParametersTab, aboutTab, connectionTab]}
      width={width}
      setSelectedTab={setSelectedTab}
      setIsCollapsed={setIsCollapsed}
      trackEvent={handleTrackEvent}
    />
  );
};

// TODO: 12798935 Analytics (event logging)
const handleTrackEvent = (data: PageActionTelemetryData): void => {
  console.log('Track Event');
};
