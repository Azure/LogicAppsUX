import { PanelLocation, PanelScope } from '../panelUtil';
import { PanelHeaderComment } from './panelheadercomment';
import type { TitleChangeHandler } from './panelheadertitle';
import { PanelHeaderTitle } from './panelheadertitle';
import { Button, Menu, MenuList, MenuPopover, MenuTrigger, Spinner, Tooltip } from '@fluentui/react-components';
import {
  bundleIcon,
  ChevronRight24Filled,
  ChevronRight24Regular,
  MoreVertical24Filled,
  MoreVertical24Regular,
} from '@fluentui/react-icons';
import type { IButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';
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
  headerMenuItems: JSX.Element[];
  noNodeSelected?: boolean;
  panelScope: PanelScope;
  suppressDefaultNodeSelectFunctionality?: boolean;
  readOnlyMode?: boolean;
  renameTitleDisabled?: boolean;
  showCommentBox?: boolean;
  title?: string;
  nodeId: string;
  horizontalPadding: string;
  canResubmit?: boolean;
  resubmitOperation?: () => void;
  commentChange(panelCommentChangeEvent?: string): void;
  onRenderWarningMessage?(): JSX.Element;
  toggleCollapse: () => void;
  onTitleChange: TitleChangeHandler;
  onTitleBlur?: (prevtitle: string) => void;
}

const DismissIcon = bundleIcon(ChevronRight24Filled, ChevronRight24Regular);
const OverflowIcon = bundleIcon(MoreVertical24Filled, MoreVertical24Regular);

export const PanelHeader = ({
  isCollapsed,
  headerLocation,
  cardIcon,
  comment,
  noNodeSelected,
  isError,
  isLoading,
  panelScope,
  suppressDefaultNodeSelectFunctionality,
  titleId,
  headerMenuItems,
  readOnlyMode,
  renameTitleDisabled,
  showCommentBox,
  title,
  nodeId,
  horizontalPadding,
  canResubmit,
  resubmitOperation,
  commentChange,
  onRenderWarningMessage,
  toggleCollapse,
  onTitleChange,
  onTitleBlur,
}: PanelHeaderProps): JSX.Element => {
  const intl = useIntl();

  const menuButtonRef = React.createRef<IButton>();

  const resubmitButtonText = intl.formatMessage({
    defaultMessage: 'Submit from this action',
    id: 'I+85NV',
    description: 'Button label for submitting a workflow to rerun from this action',
  });
  useEffect(() => {
    menuButtonRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCollapsed]);

  const isRight = headerLocation === PanelLocation.Right;

  const noNodeOnCardLevel = noNodeSelected && panelScope === PanelScope.CardLevel;
  const shouldHideCollapseButton = isCollapsed && suppressDefaultNodeSelectFunctionality;

  // collapsed -> loading -> connector icon -> error -> backup loading
  const iconComponent = useMemo(
    () =>
      isCollapsed ? null : isLoading ? (
        <div className="msla-panel-card-icon">
          <Spinner size={'tiny'} style={{ padding: '6px' }} />
        </div>
      ) : cardIcon ? (
        <img className="msla-panel-card-icon" src={cardIcon} alt="panel card icon" />
      ) : isError ? (
        <div className="msla-panel-card-icon default">
          <Icon iconName="PlugDisconnected" style={{ fontSize: '20px', textAlign: 'center', color: 'white' }} />
        </div>
      ) : (
        <Spinner className="msla-card-header-spinner" size={'tiny'} />
      ),
    [isLoading, cardIcon, isCollapsed, isError]
  );

  const CollapseButton = (): JSX.Element => {
    const panelCollapseTitle = intl.formatMessage({
      defaultMessage: 'Collapse',
      id: 'lX30/R',
      description: 'Text of Tooltip to collapse',
    });
    const panelExpandTitle = intl.formatMessage({
      defaultMessage: 'Expand',
      id: 'oZMhX/',
      description: 'Text of Tooltip to expand',
    });
    const buttonText = isCollapsed ? panelExpandTitle : panelCollapseTitle;

    const className: string = css('collapse-toggle', isRight ? 'right' : 'left', isCollapsed && 'collapsed');

    return (
      <Tooltip relationship="label" positioning={'before'} content={buttonText}>
        <Button
          autoFocus={!isCollapsed}
          id="msla-panel-header-collapse-nav"
          appearance="subtle"
          icon={<DismissIcon />}
          className={className}
          aria-label={buttonText}
          onClick={toggleCollapse}
          data-automation-id="msla-panel-header-collapse-nav"
        />
      </Tooltip>
    );
  };

  const OverflowButton = (): JSX.Element => {
    const PanelHeaderMenuCommands = intl.formatMessage({
      defaultMessage: 'More commands',
      id: '0y5eia',
      description: 'Label for commands in panel header',
    });

    return (
      <Menu>
        <MenuTrigger>
          <Tooltip relationship={'label'} positioning={'before'} content={PanelHeaderMenuCommands}>
            <Button
              appearance="subtle"
              icon={<OverflowIcon />}
              aria-label={PanelHeaderMenuCommands}
              data-automation-id="msla-panel-header-more-options"
            />
          </Tooltip>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>{headerMenuItems}</MenuList>
        </MenuPopover>
      </Menu>
    );
  };

  return (
    <div className="msla-panel-header" id={noNodeOnCardLevel ? titleId : title}>
      {shouldHideCollapseButton ? undefined : <CollapseButton />}
      {!noNodeOnCardLevel && !isCollapsed ? (
        <>
          <div className={'msla-panel-card-header'} style={isRight ? {} : { paddingLeft: horizontalPadding }}>
            {iconComponent}
            <div className={'msla-panel-card-title-container'}>
              <PanelHeaderTitle
                key={nodeId}
                titleId={titleId}
                readOnlyMode={readOnlyMode}
                renameTitleDisabled={renameTitleDisabled}
                titleValue={title}
                onChange={onTitleChange}
                onBlur={onTitleBlur}
              />
            </div>
            <OverflowButton />
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
          {canResubmit ? (
            <Button
              style={{ marginLeft: '2rem', marginTop: '1rem', marginBottom: 0 }}
              icon={<Icon iconName="PlaybackRate1x" />}
              onClick={() => resubmitOperation?.()}
            >
              {resubmitButtonText}
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
};
