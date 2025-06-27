/* eslint-disable react/display-name */
import { StatusPill } from '../monitoring';
import { MockStatusIcon } from '../unitTesting/mockStatusIcon';
import type { OutputMock } from '../unitTesting/outputMocks';
import { CardFooter } from './cardfooter';
import { ErrorBanner } from './errorbanner';
import { useCardKeyboardInteraction } from './hooks';
import { Gripper } from './images/dynamicsvgs/gripper';
import type { CommentBoxProps } from './types';
import { getCardStyle } from './utils';
import type { MessageBarType } from '@fluentui/react';
import { Icon } from '@fluentui/react';
import { mergeClasses, Spinner, useRestoreFocusTarget } from '@fluentui/react-components';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { replaceWhiteSpaceWithUnderscore } from '@microsoft/logic-apps-shared';
import type { MouseEventHandler } from 'react';
import { memo, useEffect, useMemo, useRef } from 'react';
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
  drag: ConnectDragSource;
  draggable: boolean;
  dragPreview: ConnectDragPreview;
  errorLevel?: MessageBarType;
  errorMessage?: string;
  icon?: string;
  id: string;
  isDragging?: boolean;
  isUnitTest?: boolean;
  isLoading?: boolean;
  nodeIndex?: number;
  readOnly?: boolean;
  rootRef?: React.RefObject<HTMLDivElement>;
  selectionMode?: 'selected' | 'pinned' | false;
  staticResultsEnabled?: boolean;
  title: string;
  onClick?(): void;
  onContextMenu?: MouseEventHandler<HTMLElement>;
  onDeleteClick?(): void;
  onCopyClick?(): void;
  runData?: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger;
  setFocus?: boolean;
  isSecureInputsOutputs?: boolean;
  nodeMockResults?: OutputMock;
  isMockSupported?: boolean;
  isLoadingDynamicData?: boolean;
  showStatusPill?: boolean;
}

export interface BadgeProps {
  additionalClassNames?: string[];
  badgeText: string;
  title: string;
}

export const Card: React.FC<CardProps> = memo(
  ({
    active = true,
    brandColor,
    cloned,
    commentBox,
    connectionDisplayName,
    connectionRequired,
    connectorName,
    drag,
    draggable,
    dragPreview,
    errorLevel,
    errorMessage,
    icon,
    id,
    isDragging,
    isUnitTest,
    nodeMockResults,
    isMockSupported,
    isLoading,
    nodeIndex,
    onClick,
    onDeleteClick,
    onCopyClick,
    onContextMenu,
    selectionMode,
    staticResultsEnabled,
    title,
    runData,
    setFocus,
    isSecureInputsOutputs,
    isLoadingDynamicData,
    showStatusPill,
  }) => {
    const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
      e.stopPropagation();
      onClick?.();
    };
    const focusRef = useRef<HTMLElement | null>(null);
    const keyboardInteraction = useCardKeyboardInteraction(onClick, onDeleteClick, onCopyClick);
    const restoreFocusTargetAttribute = useRestoreFocusTarget();

    useEffect(() => {
      if (setFocus) {
        focusRef.current?.focus();
      }
    }, [setFocus]);

    const intl = useIntl();

    const cardAltTexts = useMemo(() => {
      const cardAltTextArgs = {
        connectorName,
        operationName: title,
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
    }, [connectorName, intl, title]);

    const cardAltText = connectorName
      ? title
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
      <div
        {...restoreFocusTargetAttribute}
        ref={(node) => {
          dragPreview(node);
          focusRef.current = node;
          drag(node);
        }}
        role={'button'}
        id={`msla-node-${id}`}
        aria-label={cardAltText}
        className={mergeClasses(
          'msla-panel-card-container',
          selectionMode === 'selected' && 'msla-panel-card-container-selected',
          !active && 'msla-card-inactive',
          cloned && 'msla-card-ghost-image',
          isDragging && 'dragging'
        )}
        style={getCardStyle(brandColor)}
        data-testid={`card-${title}`}
        data-automation-id={`card-${replaceWhiteSpaceWithUnderscore(title)}`}
        onClick={handleClick}
        onContextMenu={onContextMenu}
        onKeyDown={keyboardInteraction.keyDown}
        tabIndex={nodeIndex}
        onKeyUp={keyboardInteraction.keyUp}
      >
        {showStatusPill ? (
          <StatusPill
            id={`${title}-status`}
            status={runData?.status}
            duration={runData?.duration}
            startTime={runData?.startTime}
            endTime={runData?.endTime}
            resubmittedResults={runData?.executionMode === 'ResubmittedResults'}
          />
        ) : null}
        {isUnitTest && isMockSupported ? <MockStatusIcon id={`${title}-status`} nodeMockResults={nodeMockResults} /> : null}
        <div className={mergeClasses('msla-selection-box', selectionMode)} />
        <div className="panel-card-main">
          <div className="panel-card-header" role="button">
            <div className="panel-card-content-container">
              <div className={mergeClasses('panel-card-content-gripper-section', draggable && 'draggable')}>
                {draggable ? <Gripper /> : null}
              </div>
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
            isLoadingDynamicData={isLoadingDynamicData}
            nodeIndex={nodeIndex}
            title={title}
          />
        </div>
      </div>
    );
  }
);
