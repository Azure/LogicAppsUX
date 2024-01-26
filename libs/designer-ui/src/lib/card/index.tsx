import { StatusPill } from '../monitoring';
import { convertUIElementNameToAutomationId } from '../utils';
import { CardContextMenu } from './cardcontextmenu';
import { CardFooter } from './cardfooter';
import { ErrorBanner } from './errorbanner';
import { useCardContextMenu, useCardKeyboardInteraction } from './hooks';
import { Gripper } from './images/dynamicsvgs/gripper';
import type { CommentBoxProps } from './types';
import { getCardStyle } from './utils';
import type { ISpinnerStyles, MessageBarType } from '@fluentui/react';
import { Icon, css } from '@fluentui/react';
import { Spinner } from '@fluentui/react-components';
import type { LogicAppsV2 } from '@microsoft/utils-logic-apps';
import { useEffect, useMemo, useRef } from 'react';
import type { ConnectDragPreview, ConnectDragSource } from 'react-dnd';
import { useIntl } from 'react-intl';

export interface CardProps {
  active?: boolean;
  brandColor: string;
  cloned?: boolean;
  commentBox?: CommentBoxProps;
  connectionDisplayName?: string;
  connectionRequired?: boolean;
  connectorName?: string;
  contextMenuItems?: JSX.Element[];
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
  onDeleteClick?(): void;
  onCopyClick?(): void;
  runData?: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger;
  setFocus?: boolean;
  isSecureInputsOutputs?: boolean;
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
  connectorName,
  contextMenuItems = [],
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
  onDeleteClick,
  onCopyClick,
  runData,
  setFocus,
  isSecureInputsOutputs,
}) => {
  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    onClick?.();
  };
  const focusRef = useRef<HTMLElement | null>(null);
  const keyboardInteraction = useCardKeyboardInteraction(onClick, onDeleteClick, onCopyClick);
  const contextMenu = useCardContextMenu();

  useEffect(() => {
    if (setFocus) {
      focusRef.current?.focus();
    }
  }, [setFocus]);

  const intl = useIntl();

  const connectorIconAltText = intl.formatMessage(
    {
      defaultMessage: '{connectorName} connector icon',
      description: 'Alt text for connector image',
    },
    {
      connectorName,
    }
  );

  const cardIcon = useMemo(
    () =>
      isLoading ? (
        <Spinner className="msla-card-header-spinner" size={'tiny'} />
      ) : icon ? (
        <img className="panel-card-icon" src={icon} alt={connectorIconAltText} />
      ) : errorMessage ? (
        <div className="panel-card-icon default">
          <Icon iconName="PlugDisconnected" style={{ fontSize: '16px', textAlign: 'center' }} />
        </div>
      ) : (
        <Spinner className="msla-card-header-spinner" size={'tiny'} />
      ),
    [icon, isLoading, errorMessage, connectorIconAltText]
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
        tabIndex={2}
        onKeyUp={keyboardInteraction.keyUp}
      >
        {isMonitoringView ? (
          <StatusPill
            id={`${title}-status`}
            status={runData?.status}
            duration={runData?.duration}
            startTime={runData?.startTime}
            endTime={runData?.endTime}
            resubmittedResults={runData?.executionMode === 'ResubmittedResults'}
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
      </div>
      {contextMenuItems.length > 0 && (
        <CardContextMenu
          contextMenuLocation={contextMenu.location}
          menuItems={contextMenuItems}
          open={contextMenu.isShowing}
          title={title}
          setOpen={contextMenu.setIsShowing}
        />
      )}
    </div>
  );
};
