import { css, IconButton, MessageBarType, TooltipHost } from '@fluentui/react';
import { Event, EventHandler } from '../eventhandler';
import * as React from 'react';
import { DocLinkClickedEventHandler, TipProps, TitleChangeEvent } from '..';

import { CommentBoxProps } from './commentbox';
import { MenuItemOption } from './menu';
import { Title } from '../title';

export interface CardProps {
  brandColor?: string;
  collapsed?: boolean;
  commentBox?: CommentBoxProps;
  connectionDisplayName?: string;
  connectionRequired?: boolean;
  contextMenuOptions?: MenuItemOption[];
  darkHeader?: boolean;
  description?: string;
  documentation?: Swagger.ExternalDocumentation;
  draggable?: boolean;
  errorLevel?: MessageBarType;
  errorMessage?: string;
  failed?: boolean;
  headerBadges?: BadgeProps[];
  headerIcons?: ImageHeaderIcon[];
  headerWidth?: string;
  hideComment?: boolean;
  hideHeaderLogo?: boolean;
  hideShowContents?: boolean;
  icon?: string;
  invalid?: boolean;
  isEditingTitle?: boolean;
  isLoadingContent?: boolean;
  isPanelModeEnabled?: boolean;
  menuItemOptions?: MenuItemOption[];
  openWindow?(url: string): Promise<boolean>;
  readOnly?: boolean;
  rootRef?: React.RefObject<HTMLDivElement>;
  staticResultsEnabled?: boolean;
  selected?: boolean;
  showConnectionsOnMenu?: boolean;
  tag?: string;
  tip?: TipProps;
  title?: string;
  warning?: string;
  width?: string;
  onClick?: EventHandler<any>;
  onCollapse?: EventHandler<any>;
  onCommitTitleChange?: EventHandler<TitleChangeEvent>;
  onDiscardTitleChange?: EventHandler<Event<typeof Title>>;
  onDocLinkClick?: DocLinkClickedEventHandler;
  onDragEnd?(): void;
  onDragStart?: React.DragEventHandler<HTMLElement>;
  onMenuShown?(): void;
  onRenderCardViewHeaderServiceDescriptionIcon?(): JSX.Element;
  handleCardViewHeaderService?(): boolean;
}

export interface BadgeProps {
  additionalClassNames?: string[];
  badgeText: string;
  title: string;
}

export interface ImageHeaderIcon {
  additionalClassNames?: string[];
  iconName: string;
  title: string;
  onClick?(): void;
}

export function ImageHeaderIcons(props: { headerIcons: ImageHeaderIcon[] }): JSX.Element | null {
  const { headerIcons } = props;

  if (headerIcons && headerIcons.length > 0) {
    return (
      <>
        {headerIcons.map(({ additionalClassNames = [], iconName, title, onClick }: ImageHeaderIcon) => (
          <TooltipHost content={title} key={`${title}-${iconName}`}>
            <IconButton
              aria-label={title}
              className={css('msla-button', 'msla-card-title-button', ...additionalClassNames)}
              iconProps={{ className: 'msla-card-title-button-icon', iconName }}
              onClick={onClick}
            />
          </TooltipHost>
        ))}
      </>
    );
  }

  return null;
}

export function BadgeHeaderIcons(props: { headerIcons: BadgeProps[]; isVisible?: boolean }): JSX.Element | null {
  const { headerIcons, isVisible: isEditingTitle } = props;

  if (!isEditingTitle && headerIcons && headerIcons.length > 0) {
    return (
      <>
        {headerIcons.map(({ additionalClassNames = [], badgeText, title }: BadgeProps) => (
          <div key={`${title}-${badgeText}`} title={title} aria-label={badgeText} className={css('msla-badge', ...additionalClassNames)}>
            {badgeText}
          </div>
        ))}
      </>
    );
  }

  return null;
}
