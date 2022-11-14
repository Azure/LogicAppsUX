import { StatusPill } from '../monitoring';
import { CardContextMenu } from './cardcontextmenu';
import { CardFooter } from './cardfooter';
import { ErrorBanner } from './errorbanner';
import { useCardContextMenu, useCardKeyboardInteraction } from './hooks';
import { Gripper } from './images/dynamicsvgs/gripper';
import type { CommentBoxProps, MenuItemOption } from './types';
import { getCardStyle } from './utils';
import type { ISpinnerStyles, MessageBarType } from '@fluentui/react';
import { Spinner, SpinnerSize, css } from '@fluentui/react';
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
  isDragging?: boolean;
  isMonitoringView?: boolean;
  isLoading?: boolean;
  readOnly?: boolean;
  rootRef?: React.RefObject<HTMLDivElement>;
  selected?: boolean;
  staticResultsEnabled?: boolean;
  title: string;
  onClick?(): void;
}

export interface BadgeProps {
  additionalClassNames?: string[];
  badgeText: string;
  title: string;
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
  isDragging,
  isMonitoringView,
  isLoading,
  selected,
  staticResultsEnabled,
  title,
  onClick,
}) => {
  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    onClick?.();
  };

  const keyboardInteraction = useCardKeyboardInteraction(onClick, contextMenuOptions);
  const contextMenu = useCardContextMenu();

  const cardIcon = isLoading ? (
    <Spinner className="msla-card-header-spinner" size={SpinnerSize.medium} />
  ) : icon ? (
    <img className="panel-card-icon" src={icon} alt="" />
  ) : (
    // There is some race condition where the icon is not available yet but the loading state is off
    <Spinner className="msla-card-header-spinner" size={SpinnerSize.medium} />
  );

  return (
    <div ref={dragPreview} style={{ position: 'relative' }}>
      <div
        ref={drag}
        aria-describedby={describedBy}
        aria-label={title}
        className={css(
          'msla-panel-card-container',
          selected && 'msla-panel-card-container-selected',
          !active && 'inactive',
          cloned && 'msla-card-ghost-image',
          isDragging && 'dragging'
        )}
        style={getCardStyle(brandColor)}
        data-testid={`card-${title}`}
        onClick={handleClick}
        onContextMenu={contextMenu.handle}
        onKeyDown={keyboardInteraction.keyDown}
        tabIndex={0}
        onKeyUp={keyboardInteraction.keyUp}
      >
        {isMonitoringView ? <StatusPill id={`${title}-status`} status={'Succeeded'} duration={'0s'} /> : null}
        <div className={css('msla-selection-box', selected && 'selected')} />
        <div className="panel-card-main">
          <div className="panel-card-header" role="button">
            <div className="panel-card-content-container">
              <div className={css('panel-card-content-gripper-section', draggable && 'draggable')}>{draggable ? <Gripper /> : null}</div>
              <div className="panel-card-content-icon-section">{cardIcon}</div>
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
            contextMenuLocation={contextMenu.location}
            contextMenuOptions={contextMenuOptions}
            showContextMenu={contextMenu.isShowing}
            title={title}
            onSetShowContextMenu={contextMenu.setIsShowing}
          />
        ) : null}
      </div>
    </div>
  );
};
