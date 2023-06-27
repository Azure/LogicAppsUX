import { StatusPill } from '../monitoring';
import { convertUIElementNameToAutomationId } from '../utils';
import { CardContextMenu } from './cardcontextmenu';
import { CardFooter } from './cardfooter';
import { ErrorBanner } from './errorbanner';
import { useCardContextMenu, useCardKeyboardInteraction } from './hooks';
import { Gripper } from './images/dynamicsvgs/gripper';
import type { CommentBoxProps, MenuItemOption } from './types';
import { getCardStyle } from './utils';
import type { ISpinnerStyles, MessageBarType } from '@fluentui/react';
import { Icon, Spinner, SpinnerSize, css } from '@fluentui/react';
import type { LogicAppsV2 } from '@microsoft/utils-logic-apps';
import { useEffect, useMemo, useRef } from 'react';
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
  runData: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger | undefined;
  setFocus?: boolean;
  isSecureInputsOutputs: boolean;
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
  runData = {},
  setFocus,
  isSecureInputsOutputs,
}) => {
  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    onClick?.();
  };
  const focusRef = useRef<HTMLElement | null>(null);
  const keyboardInteraction = useCardKeyboardInteraction(onClick, contextMenuOptions);
  const contextMenu = useCardContextMenu();

  useEffect(() => {
    if (setFocus) {
      focusRef.current?.focus();
    }
  }, [setFocus]);

  const cardIcon = useMemo(
    () =>
      isLoading ? (
        <Spinner className="msla-card-header-spinner" size={SpinnerSize.medium} />
      ) : icon ? (
        <img className="panel-card-icon" src={icon} alt="" />
      ) : errorMessage ? (
        <div className="panel-card-icon default">
          <Icon iconName="PlugDisconnected" style={{ fontSize: '16px', textAlign: 'center' }} />
        </div>
      ) : (
        <Spinner className="msla-card-header-spinner" size={SpinnerSize.medium} />
      ),
    [icon, isLoading, errorMessage]
  );

  return (
    <div ref={dragPreview} style={{ position: 'relative' }}>
      <div
        ref={(node) => {
          focusRef.current = node;
          drag(node);
        }}
        aria-describedby={describedBy}
        className={css(
          'msla-panel-card-container',
          selected && 'msla-panel-card-container-selected',
          !active && 'inactive',
          cloned && 'msla-card-ghost-image',
          isDragging && 'dragging'
        )}
        style={getCardStyle(brandColor)}
        data-testid={`card-${title}`}
        data-automation-id={`card-${convertUIElementNameToAutomationId(title)}`}
        onClick={handleClick}
        onContextMenu={contextMenu.handle}
        onKeyDown={keyboardInteraction.keyDown}
        tabIndex={1}
        onKeyUp={keyboardInteraction.keyUp}
      >
        {isMonitoringView ? (
          <StatusPill
            id={`${title}-status`}
            status={runData.status}
            duration={runData.duration}
            startTime={runData.startTime}
            endTime={runData.endTime}
          />
        ) : null}
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
            {errorMessage ? <ErrorBanner errorLevel={errorLevel} errorMessage={errorMessage} /> : null}
          </div>
          <CardFooter
            commentBox={commentBox}
            connectionDisplayName={connectionDisplayName}
            connectionRequired={connectionRequired}
            staticResultsEnabled={staticResultsEnabled}
            isSecureInputsOutputs={isSecureInputsOutputs}
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
