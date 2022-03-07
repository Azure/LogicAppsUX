import type { MenuItemOption } from '../../card/types';
import { PanelHeaderComment } from './panelheadercomment';
import { PanelHeaderTitle } from './panelheadertitle';
import type { IButton, IButtonStyles } from '@fluentui/react/lib/Button';
import { IconButton } from '@fluentui/react/lib/Button';
import type { ICalloutProps } from '@fluentui/react/lib/Callout';
import { DirectionalHint } from '@fluentui/react/lib/Callout';
import type { IOverflowSetItemProps, IOverflowSetStyles } from '@fluentui/react/lib/OverflowSet';
import { OverflowSet } from '@fluentui/react/lib/OverflowSet';
import { FontSizes } from '@fluentui/react/lib/Styling';
import type { ITooltipHostStyles } from '@fluentui/react/lib/Tooltip';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { css } from '@fluentui/react/lib/Utilities';
import React, { useCallback } from 'react';
import { useIntl } from 'react-intl';

export const handleOnEscapeDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
  if (e.key === 'Escape') {
    e.preventDefault();
  }
};
export interface PanelHeaderProps {
  isCollapsed: boolean;
  isRight?: boolean;
  cardIcon?: string;
  comment?: string;
  panelHeaderControlType?: PanelHeaderControlType;
  panelHeaderMenu: MenuItemOption[];
  noNodeSelected?: boolean;
  readOnlyMode?: boolean;
  renameTitleDisabled?: boolean;
  showCommentBox?: boolean;
  title?: string;
  commentChange?(panelCommentChangeEvent?: string): void;
  onRenderWarningMessage?(): JSX.Element;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}
export enum PanelHeaderControlType {
  DISMISS_BUTTON,
  MENU,
}

const collapseIconStyle: IButtonStyles = {
  icon: {
    fontSize: FontSizes.small,
  },
};

const calloutProps: ICalloutProps = {
  directionalHint: DirectionalHint.leftCenter,
};

const overflowStyle: Partial<IOverflowSetStyles> = {
  root: {
    height: '100%',
    backgroundColor: 'transparent',
    width: '100%',
  },
};

const tooltipStyles: ITooltipHostStyles = {
  root: {
    display: 'block',
  },
};

export const PanelHeader = ({
  isCollapsed,
  isRight,
  cardIcon,
  comment,
  noNodeSelected,
  panelHeaderControlType,
  panelHeaderMenu,
  readOnlyMode,
  renameTitleDisabled,
  showCommentBox,
  title,
  commentChange,
  onRenderWarningMessage,
  setIsCollapsed,
}: PanelHeaderProps): JSX.Element => {
  const intl = useIntl();

  const menuButtonRef = React.createRef<IButton>();

  const panelCollapseTitle = intl.formatMessage({
    defaultMessage: 'Collapse/Expand',
    description: 'Text of Tooltip to collapse and expand',
  });

  const getIconClassName: string = css(isRight ? 'collapse-toggle-right' : 'collapse-toggle-left', isCollapsed && 'collapsed');

  const getCollapseIconName: string = isRight && isCollapsed ? 'DoubleChevronLeft8' : 'DoubleChevronRight8';

  const toggleCollapse = useCallback((): void => {
    // TODO: 12798935 Analytics (event logging)
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed, setIsCollapsed]);

  const getPanelHeaderMenu = (): JSX.Element => {
    const panelHeaderMenuItems = panelHeaderMenu.map((item) => ({
      key: item.key,
      name: item.title,
      iconProps: {
        iconName: item.iconName,
      },
      onClick: item.onClick,
      iconOnly: true,
      disabled: item.disabled,
    }));
    return (
      <OverflowSet
        styles={overflowStyle}
        items={[]}
        overflowItems={panelHeaderMenuItems}
        onRenderOverflowButton={onRenderOverflowButton}
        onRenderItem={function (item: IOverflowSetItemProps) {
          throw new Error('Function not implemented.');
        }}
      />
    );
  };

  const onRenderOverflowButton = (overflowItems: any[] | undefined): JSX.Element => {
    const calloutProps: ICalloutProps = {
      directionalHint: DirectionalHint.leftCenter,
    };

    const PanelHeaderMenuCommands = intl.formatMessage({
      defaultMessage: 'More commands',
      description: 'Label for commands in panel header',
    });
    return (
      <TooltipHost calloutProps={calloutProps} content={PanelHeaderMenuCommands}>
        <IconButton
          ariaLabel={PanelHeaderMenuCommands}
          styles={overflowStyle}
          componentRef={menuButtonRef}
          menuIconProps={{ iconName: 'More' }}
          menuProps={overflowItems && { items: overflowItems }}
        />
      </TooltipHost>
    );
  };
  return (
    <div className="msla-panel-header">
      <TooltipHost calloutProps={calloutProps} content={panelCollapseTitle} styles={tooltipStyles}>
        <IconButton
          ariaLabel={panelCollapseTitle}
          className={getIconClassName}
          disabled={false}
          iconProps={{ iconName: getCollapseIconName }}
          styles={collapseIconStyle}
          onClick={toggleCollapse}
        />
      </TooltipHost>
      {!noNodeSelected ? (
        <div className="msla-panel-card-header">
          {cardIcon ? <img className="msla-panel-card-icon" src={cardIcon} hidden={isCollapsed} alt="panel card icon" /> : null}
          <div className="msla-title-container" hidden={isCollapsed}>
            <PanelHeaderTitle readOnlyMode={readOnlyMode} renameTitleDisabled={renameTitleDisabled} title={title} />
          </div>
          <div className="msla-panel-header-controls" hidden={isCollapsed}>
            {!noNodeSelected && panelHeaderControlType === PanelHeaderControlType.MENU ? getPanelHeaderMenu() : null}
            {/* 
            TODO: 13067650 implemented when panel actions gets built
            {!noNodeSelected && panelHeaderControlType === PanelHeaderControlType.DISMISS_BUTTON ? getDismissButton() : null} 
            */}
          </div>
          {onRenderWarningMessage ? onRenderWarningMessage() : null}
          {showCommentBox ? (
            <PanelHeaderComment
              comment={comment}
              isCollapsed={isCollapsed}
              noNodeSelected={noNodeSelected}
              readOnlyMode={readOnlyMode}
              commentChange={commentChange}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
