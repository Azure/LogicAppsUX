import { mergeClasses, Text, Spinner, useRestoreFocusTarget } from '@fluentui/react-components';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { replaceWhiteSpaceWithUnderscore } from '@microsoft/logic-apps-shared';
import type { OutputMock } from '../../../../core/state/unitTest/unitTestInterfaces';
import { useKeyboardInteraction } from './keyboardInteraction';
import type { MouseEventHandler } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import type { ConnectDragPreview, ConnectDragSource } from 'react-dnd';
import { useIntl } from 'react-intl';
import { useCardStyles } from './card.styles';
import { CardStatusBadge } from './cardStatusBadge';

export interface CardProps {
  active?: boolean;
  cloned?: boolean;
  connectorName?: string;
  drag: ConnectDragSource;
  dragPreview: ConnectDragPreview;
  errorMessages?: string[];
  icon?: string;
  id: string;
  isDragging?: boolean;
  isUnitTest?: boolean;
  isLoading?: boolean;
  isSelected?: boolean;
  nodeIndex?: number;
  readOnly?: boolean;
  rootRef?: React.RefObject<HTMLDivElement>;
  staticResultsEnabled?: boolean;
  title: string;
  onClick?(): void;
  onContextMenu?: MouseEventHandler<HTMLElement>;
  onDeleteClick?(): void;
  onCopyClick?(): void;
  runData?: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger;
  setFocus?: boolean;
  nodeMockResults?: OutputMock;
  isMockSupported?: boolean;
  isLoadingDynamicData?: boolean;
  subtleBackground?: boolean;
}

export interface BadgeProps {
  additionalClassNames?: string[];
  badgeText: string;
  title: string;
}

export const Card: React.FC<CardProps> = ({
  id,
  active = true,
  connectorName,
  drag,
  // errorMessages = [],
  icon,
  // isUnitTest,
  // nodeMockResults,
  // isMockSupported,
  isLoading,
  isSelected,
  nodeIndex,
  onClick,
  onDeleteClick,
  onCopyClick,
  onContextMenu,
  title,
  runData,
  setFocus,
  isLoadingDynamicData,
}) => {
  const styles = useCardStyles();

  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
    onClick?.();
  };
  const focusRef = useRef<HTMLElement | null>(null);
  const keyboardInteraction = useKeyboardInteraction(onClick, onDeleteClick, onCopyClick);
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
    () => (isLoading ? <Spinner size={'tiny'} /> : icon ? <img src={icon} alt="" /> : <Spinner size={'tiny'} />),
    [isLoading, icon]
  );

  return (
    <div
      {...restoreFocusTargetAttribute}
      ref={(node) => {
        focusRef.current = node;
        drag(node);
      }}
      role="button"
      id={`msla-node-${id}`}
      aria-label={cardAltText}
      className={mergeClasses(
        styles.root,
        !active && styles.inactive,
        runData?.status === 'Succeeded' && styles.statusSuccess,
        runData?.status === 'Failed' && styles.statusError,
        isSelected && styles.selected
      )}
      data-testid={`card-${title}`}
      data-automation-id={`card-${replaceWhiteSpaceWithUnderscore(title)}`}
      onClick={handleClick}
      onContextMenu={onContextMenu}
      onKeyDown={keyboardInteraction.keyDown}
      onKeyUp={keyboardInteraction.keyUp}
      tabIndex={nodeIndex}
    >
      {runData?.status ? <CardStatusBadge status={runData?.status} duration={runData?.duration} /> : null}
      {/* {isUnitTest && isMockSupported ? (
				<MockStatusIcon id={`${title}-status`} nodeMockResults={nodeMockResults} />
			) : null} */}
      <div className={styles.icon}>{cardIcon}</div>
      <Text className={styles.title}>{title}</Text>
      {isLoadingDynamicData ? <Spinner size={'extra-tiny'} /> : null}
    </div>
  );
};
