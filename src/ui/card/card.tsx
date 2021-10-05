// import { IButton, IconButton } from '@fluentui/react/lib/Button';
// import { Callout, DirectionalHint } from '@fluentui/react/lib/Callout';
// import { IMessageBarStyles, MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
// import { TooltipHost } from '@fluentui/react/lib/Tooltip';
// import { css } from '@fluentui/react/lib/Utilities';
import { css, IconButton, MessageBarType, TooltipHost } from '@fluentui/react';
import { Event, EventHandler } from '../eventhandler';
import * as React from 'react';
import { DocLinkClickedEventHandler, InfoControlProps, TipProps, TitleChangeEvent } from '..';

import { CommentBoxProps } from './commentbox';
import { MenuItemOption } from './menu';
import { Title } from '../title';
// import { findDOMNode } from 'react-dom';
// import { equals, format, hexToRgbA } from '../../common/utilities/Utils';

// import { BaseComponent, BaseComponentProps } from '../base';
// import Constants from '../constants';
// import { Event, EventHandler } from '../eventhandler';
// import { getDragStartHandlerWhenDisabled } from '../helper';
// import { InfoControl, InfoControlProps } from '../infocontrol';
// import { DocLinkClickedEventHandler, DocumentationItem } from '../recommendation3/_documentationitem';
// import { UserAction } from '../telemetry/models';
// import { Tip, TipProps } from '../tip';
// import { Title, TitleChangeEvent } from '../title';
// import { isEnterKey, isSpaceKey } from '../utils/keyboardUtils';
// import { CardV2 } from './cardv2/cardv2';
// import { CommentBox, CommentBoxProps } from './commentbox';
// import WarningIcon from './images/badges/warning.generated';
// import { Menu, MenuItemOption } from './menu/_menu';

// export const CardWidth = {
//   CARD: 'CARD',
//   IF: 'IF',
//   SCOPE: 'SCOPE',
//   EXPRESSIONBUILDER: 'EXPRESSIONBUILDER',
// };

// export interface ImageHeaderIcon {
//   additionalClassNames?: string[];
//   iconName: string;
//   title: string;
//   onClick?(): void;
// }

// export interface BadgeProps {
//   additionalClassNames?: string[];
//   badgeText: string;
//   title: string;
// }

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
  infoMessageOption?: InfoControlProps;
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
