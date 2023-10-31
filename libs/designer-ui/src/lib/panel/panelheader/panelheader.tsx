import type { MenuItemOption } from '../../card/types';
import { convertUIElementNameToAutomationId } from '../../utils';
import { PanelLocation, PanelScope } from '../panelUtil';
import { PanelHeaderComment } from './panelheadercomment';
import type { TitleChangeHandler } from './panelheadertitle';
import { PanelHeaderTitle } from './panelheadertitle';
import { Spinner, SpinnerSize } from '@fluentui/react';
import type { IButton, IButtonStyles } from '@fluentui/react/lib/Button';
import { IconButton } from '@fluentui/react/lib/Button';
import type { ICalloutProps } from '@fluentui/react/lib/Callout';
import { DirectionalHint } from '@fluentui/react/lib/Callout';
import type { IIconProps } from '@fluentui/react/lib/Icon';
import { Icon } from '@fluentui/react/lib/Icon';
import type { IOverflowSetItemProps, IOverflowSetStyles } from '@fluentui/react/lib/OverflowSet';
import { OverflowSet } from '@fluentui/react/lib/OverflowSet';
import { FontSizes } from '@fluentui/react/lib/Styling';
import type { ITooltipHostStyles } from '@fluentui/react/lib/Tooltip';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { css } from '@fluentui/react/lib/Utilities';
import React, { useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';

export const handleOnEscapeDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
  if (e.key === 'Escape') {
    e.preventDefault();
  }
};
export interface PanelHeaderProps {
  isCollapsed: boolean;
  headerLocation: PanelLocation;
  cardIcon?: string;
  comment?: string;
  titleId?: string;
  isError?: boolean;
  isLoading?: boolean;
  panelHeaderControlType?: PanelHeaderControlType;
  panelHeaderMenu: MenuItemOption[];
  noNodeSelected?: boolean;
  panelScope: PanelScope;
  readOnlyMode?: boolean;
  renameTitleDisabled?: boolean;
  showCommentBox?: boolean;
  title?: string;
  includeTitle: boolean;
  nodeId: string;
  horizontalPadding: string;
  commentChange(panelCommentChangeEvent?: string): void;
  onDismissButtonClicked?(): void;
  onRenderWarningMessage?(): JSX.Element;
  toggleCollapse: () => void;
  onTitleChange: TitleChangeHandler;
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

const dismissIconProps: IIconProps = {
  iconName: 'Clear',
};

const menuIconProps: IIconProps = {
  iconName: 'More',
};

const overflowStyle: Partial<IOverflowSetStyles> = {
  root: {
    height: '100%',
    backgroundColor: 'transparent',
    width: '100%',
  },
};

const tooltipStyles: Partial<ITooltipHostStyles> = {
  root: {
    height: '32px',
    width: '32px',
  },
};

export const PanelHeader = ({
  isCollapsed,
  headerLocation,
  cardIcon,
  comment,
  noNodeSelected,
  isError,
  isLoading,
  panelScope,
  titleId,
  panelHeaderControlType,
  panelHeaderMenu,
  readOnlyMode,
  renameTitleDisabled,
  showCommentBox,
  title,
  includeTitle,
  nodeId,
  horizontalPadding,
  commentChange,
  onDismissButtonClicked,
  onRenderWarningMessage,
  toggleCollapse,
  onTitleChange,
}: PanelHeaderProps): JSX.Element => {
  const intl = useIntl();

  const menuButtonRef = React.createRef<IButton>();

  useEffect(() => {
    menuButtonRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCollapsed]);
  const panelCollapseTitle = intl.formatMessage({
    defaultMessage: 'Collapse',
    description: 'Text of Tooltip to collapse',
  });
  const panelExpandTitle = intl.formatMessage({
    defaultMessage: 'Expand',
    description: 'Text of Tooltip to expand',
  });

  const isRight = headerLocation === PanelLocation.Right;

  const getIconClassName: string = css(isRight ? 'collapse-toggle-right' : 'collapse-toggle-left', isCollapsed && 'collapsed');

  const getCollapseIconName: string = (isRight && isCollapsed) || (!isRight && !isCollapsed) ? 'DoubleChevronLeft' : 'DoubleChevronRight';

  const noNodeOnCardLevel = noNodeSelected && panelScope === PanelScope.CardLevel;

  // collapsed -> loading -> connector icon -> error -> backup loading
  const iconComponent = useMemo(
    () =>
      isCollapsed ? null : isLoading ? (
        <div className="msla-panel-card-icon">
          <Spinner size={SpinnerSize.medium} style={{ padding: '6px' }} />
        </div>
      ) : cardIcon ? (
        <img className="msla-panel-card-icon" src={cardIcon} alt="panel card icon" />
      ) : isError ? (
        <div className="msla-panel-card-icon default">
          <Icon iconName="PlugDisconnected" style={{ fontSize: '20px', textAlign: 'center', color: 'white' }} />
        </div>
      ) : (
        <Spinner className="msla-card-header-spinner" size={SpinnerSize.medium} />
      ),
    [isLoading, cardIcon, isCollapsed, isError]
  );

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
      'data-automation-id': `msla-panel-overflow-${convertUIElementNameToAutomationId(item.title)}`,
    }));

    return (
      <OverflowSet
        styles={overflowStyle}
        items={[]}
        overflowItems={panelHeaderMenuItems}
        onRenderOverflowButton={onRenderOverflowButton}
        onRenderItem={function (_item: IOverflowSetItemProps) {
          throw new Error('Function not implemented.');
        }}
      />
    );
  };

  const getDismissButton = (): JSX.Element => {
    const dissmissLabel = intl.formatMessage({
      defaultMessage: 'Dismiss',
      description: 'Label for dismiss button in panel header',
    });

    return (
      <TooltipHost calloutProps={calloutProps} content={dissmissLabel}>
        <IconButton iconProps={dismissIconProps} onClick={onDismissButtonClicked} />
      </TooltipHost>
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
          data-automation-id="msla-panel-header-more-options"
          styles={overflowStyle}
          componentRef={menuButtonRef}
          menuIconProps={menuIconProps}
          menuProps={overflowItems && { items: overflowItems }}
        />
      </TooltipHost>
    );
  };

  return (
    <div className="msla-panel-header" id={noNodeOnCardLevel ? titleId : title}>
      <div className={getIconClassName}>
        <TooltipHost
          className={getIconClassName}
          calloutProps={calloutProps}
          content={isCollapsed ? panelExpandTitle : panelCollapseTitle}
          styles={tooltipStyles}
        >
          <IconButton
            ariaLabel={isCollapsed ? panelExpandTitle : panelCollapseTitle}
            disabled={false}
            iconProps={{ iconName: getCollapseIconName }}
            styles={collapseIconStyle}
            onClick={toggleCollapse}
            data-automation-id="msla-panel-header-collapse-nav"
          />
        </TooltipHost>
      </div>
      {!noNodeOnCardLevel ? (
        <>
          <div className={'msla-panel-card-header'} style={isRight || isCollapsed ? {} : { paddingLeft: horizontalPadding }}>
            {iconComponent}
            {includeTitle ? (
              <div className="msla-panel-card-title-container" hidden={isCollapsed}>
                <PanelHeaderTitle
                  key={nodeId}
                  titleId={titleId}
                  readOnlyMode={readOnlyMode}
                  renameTitleDisabled={renameTitleDisabled}
                  titleValue={title}
                  onChange={onTitleChange}
                />
              </div>
            ) : null}

            <div className="msla-panel-header-controls" hidden={isCollapsed}>
              {panelHeaderControlType === PanelHeaderControlType.MENU ? getPanelHeaderMenu() : null}
              {panelHeaderControlType === PanelHeaderControlType.DISMISS_BUTTON ? getDismissButton() : null}
            </div>
          </div>
          {onRenderWarningMessage ? onRenderWarningMessage() : null}
          {showCommentBox ? (
            <PanelHeaderComment
              comment={comment}
              isCollapsed={isCollapsed}
              noNodeSelected={noNodeOnCardLevel}
              readOnlyMode={readOnlyMode}
              commentChange={commentChange}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
};
