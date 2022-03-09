import { isDeleteKey, isEnterKey, isSpaceKey } from '../utils/keyboardUtils';
import { CardContextMenu } from './cardcontextmenu';
import { CardFooter } from './cardfooter';
import { ErrorBanner } from './errorbanner';
import { Gripper } from './images/dynamicsvgs/gripper';
import type { CommentBoxProps, MenuItemOption } from './types';
import { getCardStyle } from './utils';
import type { ISpinnerStyles, MessageBarType } from '@fluentui/react';
import { css } from '@fluentui/react';
import { equals } from '@microsoft-logic-apps/utils';
import { useState } from 'react';
import type { ConnectDragPreview, ConnectDragSource } from 'react-dnd';

export interface CardProps {
  active?: boolean;
  brandColor: string;
  cloned?: boolean;
  commentBox?: CommentBoxProps;
  connectionDisplayName?: string;
  connectionRequired?: boolean;
  contextMenuOptions?: MenuItemOption[];
  describedBy?: string;
  drag: ConnectDragSource;
  draggable: boolean;
  dragPreview: ConnectDragPreview;
  errorLevel?: MessageBarType;
  errorMessage?: string;
  icon?: string;
  id: string;
  rootRef?: React.RefObject<HTMLDivElement>;
  selected?: boolean;
  staticResultsEnabled?: boolean;
  title: string;
  onClick?(): void;
}

export const CARD_LOADING_SPINNER_STYLE: ISpinnerStyles = {
  root: {
    margin: '6px 6px 0 0',
  },
};

export const Card: React.FC<CardProps> = ({
  active = true,
  brandColor,
  cloned,
  commentBox,
  connectionDisplayName,
  connectionRequired,
  contextMenuOptions = [],
  describedBy,
  drag,
  draggable,
  dragPreview,
  errorLevel,
  errorMessage,
  icon,
  selected,
  staticResultsEnabled,
  title,
  onClick,
}) => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuLocation, setContextMenuLocation] = useState({
    x: 0,
    y: 0,
  });

  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    onClick?.();
  };

  const handleContextMenu: React.MouseEventHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu(true);
    setContextMenuLocation({ x: e.clientX, y: e.clientY });
  };

  // Prevent Enter and space bar keypresses from scrolling the page down when used to select a card.
  const handleKeyDown: React.KeyboardEventHandler<HTMLElement> = (e) => {
    if (isEnterKey(e) || isSpaceKey(e)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleKeyUp: React.KeyboardEventHandler<HTMLElement> = (e) => {
    if (isEnterKey(e) || isSpaceKey(e)) {
      e.preventDefault();
      e.stopPropagation();
      onClick?.();
    } else if (isDeleteKey(e)) {
      e.preventDefault();
      e.stopPropagation();
      for (const contextMenuOption of contextMenuOptions) {
        if (equals(contextMenuOption.key, 'delete') && !contextMenuOption.disabled) {
          contextMenuOption.onClick?.(e);
        }
      }
    }
  };

  return (
    <div ref={dragPreview}>
      <div
        ref={drag}
        aria-describedby={describedBy}
        aria-label={title}
        className={css(
          'msla-panel-card-container',
          selected && 'msla-panel-card-container-selected',
          !active && 'inactive',
          cloned && 'msla-card-ghost-image'
        )}
        style={getCardStyle(brandColor)}
        data-testid={`card-${title}`}
      >
        <div className="panel-card-main">
          <div
            className="panel-card-header"
            role="button"
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            onKeyUp={handleKeyUp}
          >
            <div className="panel-card-content-container">
              <div className="panel-card-content-gripper-section">{draggable ? <Gripper /> : null}</div>
              {icon ? (
                <div className="panel-card-content-icon-section">
                  <img className="panel-card-icon" src={icon} alt="" />
                </div>
              ) : null}
              <div className="panel-card-top-content">
                <div className="panel-msla-title">{title}</div>
              </div>
            </div>
            <ErrorBanner errorLevel={errorLevel} errorMessage={errorMessage} />
          </div>
          <CardFooter
            commentBox={commentBox}
            connectionDisplayName={connectionDisplayName}
            connectionRequired={connectionRequired}
            staticResultsEnabled={staticResultsEnabled}
          />
        </div>
        {contextMenuOptions?.length > 0 ? (
          <CardContextMenu
            contextMenuLocation={contextMenuLocation}
            contextMenuOptions={contextMenuOptions}
            showContextMenu={showContextMenu}
            title={title}
            onSetShowContextMenu={setShowContextMenu}
          />
        ) : null}
      </div>
    </div>
  );
};
