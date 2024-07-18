import { StatusPill } from '../monitoring';
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
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { replaceWhiteSpaceWithUnderscore } from '@microsoft/logic-apps-shared';
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
  operationName?: string;
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
  id,
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
  operationName,
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

  const cardAltTexts = useMemo(() => {
    const cardAltTextArgs = {
      connectorName,
      operationName,
    };

    return {
      withConnectorOnly: intl.formatMessage(
        {
          defaultMessage: '{connectorName} connector',
          id: '6sSPNb',
          description: 'Alt text on action/trigger card when there is a connector name but no operation name',
        },
        cardAltTextArgs
      ),
      withOperationOnly: intl.formatMessage(
        {
          defaultMessage: '{operationName} operation',
          id: '96JG8I',
          description: 'Alt text on action/trigger card when there is an operation name but no connector name',
        },
        cardAltTextArgs
      ),
      withConnectorAndOperation: intl.formatMessage(
        {
          defaultMessage: '{operationName} operation, {connectorName} connector',
          id: 'ncW1Sw',
          description: 'Alt text on action/trigger card when there are both an operation name and connector name',
        },
        cardAltTextArgs
      ),
    };
  }, [connectorName, intl, operationName]);

  const cardAltText = connectorName
    ? operationName
      ? cardAltTexts.withConnectorAndOperation
      : cardAltTexts.withConnectorOnly
    : cardAltTexts.withOperationOnly;

  const cardIcon = useMemo(
    () =>
      isLoading ? (
        <Spinner className="msla-card-header-spinner" size={'tiny'} />
      ) : icon ? (
        <img className="panel-card-icon" src={icon} alt="" />
      ) : errorMessage ? (
        <div className="panel-card-icon default">
          <Icon iconName="PlugDisconnected" style={{ fontSize: '16px', textAlign: 'center' }} />
        </div>
      ) : (
        <Spinner className="msla-card-header-spinner" size={'tiny'} />
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
        id={`msla-node-${id}`}
        className={css(
          'msla-panel-card-container',
          selected && 'msla-panel-card-container-selected',
          !active && 'inactive',
          cloned && 'msla-card-ghost-image',
          isDragging && 'dragging'
        )}
        style={getCardStyle(brandColor)}
        data-testid={`card-${title}`}
        data-automation-id={`card-${replaceWhiteSpaceWithUnderscore(title)}`}
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
          <div aria-label={cardAltText} className="panel-card-header" role="button">
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
