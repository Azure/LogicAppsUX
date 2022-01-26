import { IButtonStyles } from '@fluentui/react/lib/Button';
import { Icon, IIconProps } from '@fluentui/react/lib/Icon';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { css } from '@fluentui/react/lib/Utilities';
import * as React from 'react';
import { useDrag } from 'react-dnd';
import { useIntl } from 'react-intl';
import { EventHandler, Event } from '../../../ui/eventhandler';

import { equals, hexToRgbA } from '@microsoft-logic-apps/utils';

import Constants from '../../constants';
import { isDeleteKey, isEnterKey, isSpaceKey } from '../../utils/keyboardUtils';

import { CardContextMenu } from '../cardcontextmenu';
import { Gripper } from '../images/dynamicsvgs/gripper';
import { MenuItemOption } from '../menu';

import { ErrorBannerV2 } from './errorbannerv2';
import { MessageBarType } from '@fluentui/react';
import { CommentBoxProps } from '../commentbox';

type ISpinnerStyles = import('@fluentui/react/lib/Spinner').ISpinnerStyles;

export interface CardV2Props {
  /**
   * @member {boolean} [active=true] - True if the card should render activated in the monitoring view, i.e., it is an action which can execute.
   */
  active?: boolean;
  contextMenuOptions?: MenuItemOption[];
  id: string;
  cloned?: boolean;
  describedBy?: string;
  rootRef?: React.RefObject<HTMLDivElement>;
  onClick?: EventHandler<Event<any>>;
  brandColor: string;
  draggable: boolean;
  title: string;
  errorLevel?: MessageBarType;
  errorMessage?: string;
  icon?: string;
  selected?: boolean;

  commentBox?: CommentBoxProps;
  connectionDisplayName?: string;
  connectionRequired?: boolean;
  staticResultsEnabled?: boolean;
}

interface CardBadgeBarProps {
  badges: CardBadgeProps[];
  brandColor?: string;
}

interface CardBadgeProps {
  title: string;
  content: string;
  darkBackground?: boolean;
  iconProps: IIconProps;
  active: boolean;
}

const gripperLightModeFill = '#605E5C';

const commentIconProps: IIconProps = {
  iconName: 'Comment',
};

const connectionIconProps: IIconProps = {
  iconName: 'Link',
};

const staticResultIconProps: IIconProps = {
  iconName: 'TestBeaker',
};

export const CARD_LOADING_SPINNER_STYLE: ISpinnerStyles = {
  root: {
    margin: '6px 6px 0 0',
  },
};

export function CardV2(props: CardV2Props): JSX.Element {
  const [, drag, dragPreview] = useDrag(() => ({
    // "type" is required. It is used by the "accept" specification of drop targets.
    type: 'BOX',
    // The collect function utilizes a "monitor" instance (see the Overview for what this is)
    // to pull important pieces of state from the DnD system.
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult<{ parent: string; child: string }>();
      if (item && dropResult) {
        alert(`You dropped ${props.id} between ${dropResult.parent} and  ${dropResult.child}!`);
      }
    },
    item: {
      id: props.id,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  function handleContextMenu(e: React.MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu(true);
    setContextMenuLocation({ x: e.clientX, y: e.clientY });
  }

  function handleCardClick(e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation();
    cardClick();
  }

  function handleKeyUp(e: React.KeyboardEvent<HTMLElement>) {
    if (isEnterKey(e) || isSpaceKey(e)) {
      e.preventDefault();
      e.stopPropagation();
      cardClick();
    } else if (isDeleteKey(e)) {
      e.preventDefault();
      e.stopPropagation();
      const menuItemOptions = props.contextMenuOptions;
      for (const itemOption of menuItemOptions ?? []) {
        if (equals(itemOption.key, 'delete') && !itemOption.disabled) {
          itemOption.clickHandler && itemOption.clickHandler(e);
        }
      }
    }
  }

  // NOTE(absaafan): This function is used to prevent space from scrolling the page down when used to select a card.
  function handleKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (isEnterKey(e) || isSpaceKey(e)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  function onSetShowContextMenu(value: boolean): void {
    setShowContextMenu(value);
  }

  function cardClick() {
    if (props.onClick) {
      props.onClick({
        currentTarget: undefined,
      });
    }
  }

  const {
    active = true,
    brandColor,
    cloned,
    contextMenuOptions,
    describedBy,
    draggable,
    errorLevel,
    errorMessage,
    icon,
    selected,
    title,
  } = props;

  const [showContextMenu, setShowContextMenu] = React.useState(false);
  const [contextMenuLocation, setContextMenuLocation] = React.useState({
    x: 0,
    y: 0,
  });

  const rootClassNames = css(
    'msla-panel-card-container',
    selected && 'msla-panel-card-container-selected',
    !active && 'inactive',
    cloned && 'msla-card-ghost-image'
  );

  const contextMenuProps = {
    ...props,
    contextMenuLocation,
    showContextMenu,
    onSetShowContextMenu,
  };

  return (
    <div ref={dragPreview}>
      <div
        ref={drag}
        aria-describedby={describedBy}
        aria-label={title}
        className={rootClassNames}
        role="button"
        style={getCardStyle(brandColor)}
        onClick={handleCardClick}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        onKeyUp={handleKeyUp}
      >
        <div className="panel-card-main">
          <div className="panel-card-header">
            <div className="panel-card-content-container">
              <div className="panel-card-content-gripper-section">{draggable ? Gripper({ fill: gripperLightModeFill }) : null}</div>
              {icon ? (
                <div className="panel-card-content-icon-section">
                  <img className="panel-card-icon" src={icon} alt="" />
                </div>
              ) : null}
              <div className="panel-card-top-content">
                <div className="panel-msla-title">{title}</div>
              </div>
            </div>
            <ErrorBannerV2 errorLevel={errorLevel} errorMessage={errorMessage} />
          </div>
          <CardFooter {...props} />
        </div>
        {contextMenuOptions ? CardContextMenu(contextMenuProps) : null}
      </div>
    </div>
  );
}

function getCardStyle(brandColor?: string): React.CSSProperties {
  return {
    borderLeft: `4px solid ${getBrandColorRgbA(brandColor, /* opacity */ 1)}`,
    borderRadius: '2px',
  };
}

export function getCardButtonsStyle(themeColor: string): IButtonStyles {
  return {
    icon: {
      color: themeColor,
      width: 15,
      height: 15,
    },
    flexContainer: {
      width: 15,
      height: 15,
    },
    root: {
      marginTop: 11,
      padding: 0,
      margin: 0,
      width: 15,
      marginLeft: 12,
      marginRight: 10,
    },
  };
}

export function CardBadge({ title, content, darkBackground, iconProps, active }: CardBadgeProps): JSX.Element | null {
  if (!content) {
    return null;
  }

  if (active) {
    return (
      <TooltipHost content={content}>
        <Icon
          className={css('panel-card-v2-badge', 'active', darkBackground && 'darkBackground')}
          {...iconProps}
          ariaLabel={`${title}: ${content}`}
          tabIndex={0}
        />
      </TooltipHost>
    );
  } else {
    return <Icon className="panel-card-v2-badge inactive" {...iconProps} ariaLabel={title} tabIndex={0} />;
  }
}

export function CardBadgeBar({ badges, brandColor }: CardBadgeBarProps): JSX.Element | null {
  return (
    <div className="msla-badges" style={getHeaderStyle(brandColor)}>
      {badges.map(({ title, content, darkBackground, iconProps, active }) => (
        <CardBadge key={title} title={title} content={content} darkBackground={darkBackground} iconProps={iconProps} active={active} />
      ))}
    </div>
  );
}

export function CardFooter({
  commentBox,
  connectionDisplayName,
  connectionRequired,
  staticResultsEnabled,
}: CardV2Props): JSX.Element | null {
  const intl = useIntl();
  const CONNECTION_NAME_DISPLAY = intl.formatMessage({
    defaultMessage: 'Connection name',
    description: 'This is for a label for a badge, it is used for screen readers and not shown on the screen.',
  });
  const CONNECTION_CONTAINER_CONNECTION_REQUIRED = intl.formatMessage({
    defaultMessage: 'Connection required',
    description: 'This is for a label for a badge, it is used for screen readers and not shown on the screen.',
  });
  const PANEL_STATIC_RESULT_TITLE = intl.formatMessage({
    defaultMessage: 'Testing',
    description: 'Title for a tab panel',
  });
  const MENU_STATIC_RESULT_ICON_TOOLTIP = intl.formatMessage({
    defaultMessage: 'This Action has testing configured.',
    description: "This is a tooltip for the Status results badge shown on a card. It's shown when the baged is hovered over.",
  });
  const COMMENT = intl.formatMessage({
    defaultMessage: 'Comment',
    description: 'This is for a label for a badge, it is used for screen readers and not shown on the screen.',
  });
  const connectionTitle = connectionDisplayName ? CONNECTION_NAME_DISPLAY : CONNECTION_CONTAINER_CONNECTION_REQUIRED;

  const staticResultsBadge = {
    title: PANEL_STATIC_RESULT_TITLE,
    content: MENU_STATIC_RESULT_ICON_TOOLTIP,
    iconProps: staticResultIconProps,
    active: true,
  };

  const badges = [
    ...(staticResultsEnabled ? [staticResultsBadge] : []),
    ...(commentBox && commentBox.comment
      ? [
          {
            title: COMMENT,
            content: commentBox.comment,
            iconProps: commentIconProps,
            active: true,
          },
        ]
      : []),
    ...(connectionRequired
      ? [
          {
            title: connectionTitle,
            content: connectionDisplayName,
            iconProps: connectionIconProps,
            active: !!connectionDisplayName,
          },
        ]
      : []),
  ];

  return (
    <div className="msla-card-v2-footer">
      <CardBadgeBar badges={badges as any} />
    </div>
  );
}

function getBrandColorRgbA(brandColor?: string, opacity = Constants.HEADER_AND_TOKEN_OPACITY): string {
  try {
    return hexToRgbA(brandColor ?? Constants.DEFAULT_BRAND_COLOR, opacity);
  } catch {
    return hexToRgbA(Constants.DEFAULT_BRAND_COLOR, opacity);
  }
}

function getHeaderStyle(brandColor?: string): React.CSSProperties | undefined {
  return brandColor ? { backgroundColor: getBrandColorRgbA(brandColor, /* opacity */ 1) } : undefined;
}
