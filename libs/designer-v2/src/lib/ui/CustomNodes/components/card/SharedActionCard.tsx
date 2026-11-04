import { ActionNodeCard, ToolItemCard, TriggerNodeCard, type NodeToolKind } from '@microsoft/designer-ui-v2';
import { makeStyles, mergeClasses, Spinner, tokens, useMergedRefs, useRestoreFocusTarget } from '@fluentui/react-components';
import { replaceWhiteSpaceWithUnderscore } from '@microsoft/logic-apps-shared';
import { forwardRef, useCallback, useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import { defineMessages, useIntl } from 'react-intl';
import type { ActionCardProps } from './actionCard';
import { useKeyboardInteraction } from './keyboardInteraction';
import { CardIndicatorBadges } from './cardIndicatorBadges';
import { CardErrorBadge } from './cardErrorBadge';
import {
  getOperationNodeDetail,
  getOperationNodeSubtitle,
  mapActionNodeStrings,
  mapSharedRunStatus,
  mapToolNodeStrings,
} from './nodeUiStrings';
import { useCardStyles } from './card.styles';
import { useOperationNodeIcon } from './useOperationNodeIcon';
import { SharedNodeHoverCard } from './SharedNodeHoverCard';

const useStyles = makeStyles({
  inactive: { opacity: 0.3 },
  pinned: { outline: `2px solid ${tokens.colorPalettePumpkinBorderActive}`, outlineOffset: '2px' },
  dynamic: { position: 'absolute', top: '8px', right: '8px' },
  progress: { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clipPath: 'inset(50%)' },
});

const toolMessages = defineMessages({
  mcp: { defaultMessage: 'MCP tool: {title}', id: '0Rn3S4', description: 'Accessible name of an MCP tool on the designer canvas' },
  action: {
    defaultMessage: 'Tool: {title}',
    id: '0IYCac',
    description: 'Accessible name of an action or sub-workflow tool on the designer canvas',
  },
});

export interface SharedActionCardProps extends ActionCardProps {
  isTrigger?: boolean;
  operationType?: string;
  operationKind?: string;
  metadataUnavailable?: boolean;
  description?: string;
  isMonitoringView?: boolean;
  toolKind?: NodeToolKind;
}

/** Host-only adapter: no graph/store/service/localization contracts leak into the presentation package. */
export const SharedActionCard = forwardRef<HTMLDivElement, SharedActionCardProps>(function SharedActionCard(
  {
    id,
    title,
    icon,
    connectorName,
    isTrigger = false,
    operationType = '',
    operationKind,
    metadataUnavailable,
    description,
    isMonitoringView,
    toolKind,
    drag,
    dragPreview,
    rootRef,
    active = true,
    isLoading,
    isDragging,
    isSelected,
    isPinned,
    isSecureInputsOutputs,
    nodeIndex,
    onClick,
    onDeleteClick,
    onCopyClick,
    onContextMenu,
    runData,
    setFocus,
    errorMessages = [],
    isLoadingDynamicData,
    copilotModified,
    staticResultsEnabled,
    comment,
  },
  forwardedRef
) {
  const styles = useStyles();
  const hostStyles = useCardStyles();
  const intl = useIntl();
  const strings = useMemo(() => mapActionNodeStrings(intl), [intl]);
  const status = mapSharedRunStatus(runData?.status);
  const mappedStrings = useMemo(() => {
    if (runData?.status === 'Waiting') {
      return {
        status: {
          ...strings.status,
          pending: intl.formatMessage({
            defaultMessage: 'Waiting',
            id: 'd0wgcV',
            description: 'Indicates that the run is currently waiting',
          }),
        },
      };
    }
    if (runData?.status === 'Resuming') {
      return {
        status: {
          ...strings.status,
          running: intl.formatMessage({
            defaultMessage: 'Resuming',
            id: 'jenxD4',
            description: 'Indicates that the run is currently resuming',
          }),
        },
      };
    }
    // Unknown service statuses were displayed verbatim by the previous host badge.
    if (status === 'pending' && runData?.status && runData.status !== 'Pending') {
      return { status: { ...strings.status, pending: runData.status } };
    }
    return strings;
  }, [intl, runData?.status, status, strings]);
  const focusRef = useRef<HTMLDivElement>(null);
  const dndRef = useCallback(
    (node: HTMLDivElement | null) => {
      drag(node);
      dragPreview(node);
    },
    [drag, dragPreview]
  );
  const ref = useMergedRefs(focusRef, rootRef, forwardedRef, dndRef);
  const restoreFocus = useRestoreFocusTarget();
  const keyboard = useKeyboardInteraction(onClick, onDeleteClick, onCopyClick);
  useEffect(() => {
    if (setFocus) {
      focusRef.current?.focus({ preventScroll: true });
    }
  }, [setFocus]);

  const cardAltText = connectorName
    ? title
      ? intl.formatMessage(
          {
            defaultMessage: '{operationName} operation, {connectorName} connector',
            id: 'ncW1Sw',
            description: 'Alt text on action/trigger card when there are both an operation name and connector name',
          },
          { operationName: title, connectorName }
        )
      : intl.formatMessage(
          {
            defaultMessage: '{connectorName} connector',
            id: '6sSPNb',
            description: 'Alt text on action/trigger card when there is a connector name but no operation name',
          },
          { connectorName }
        )
    : intl.formatMessage(
        {
          defaultMessage: '{operationName} operation',
          id: '96JG8I',
          description: 'Alt text on action/trigger card when there is an operation name but no connector name',
        },
        { operationName: title }
      );
  const toolAltText = toolKind ? intl.formatMessage(toolMessages[toolKind === 'mcp' ? 'mcp' : 'action'], { title }) : undefined;

  const indicatorCount = Number(!!comment) + Number(!!isSecureInputsOutputs) + Number(!!staticResultsEnabled);
  const primaryLoading = !!isLoading;
  const {
    icon: cardIcon,
    selectedIcon,
    connectorLoading,
  } = useOperationNodeIcon(operationType, operationKind, icon, primaryLoading, toolKind === 'mcp');
  const errors = metadataUnavailable
    ? [
        ...errorMessages,
        intl.formatMessage({
          defaultMessage: 'Error fetching manifest',
          id: 'HmcHoE',
          description: 'Error message when manifest fails to load',
        }),
      ]
    : errorMessages;
  const Card = toolKind ? ToolItemCard : isTrigger ? TriggerNodeCard : ActionNodeCard;
  const cardStrings = useMemo(() => ({ ...mappedStrings, tool: mapToolNodeStrings(intl).tool }), [intl, mappedStrings]);
  const detail = getOperationNodeDetail(intl, operationType, operationKind, connectorName);
  const loadingLabel = intl.formatMessage({
    defaultMessage: 'Loading operation',
    id: 'CFLJFK',
    description: 'Accessible progress label while an operation card loads',
  });
  const card = (
    <Card
      {...restoreFocus}
      ref={ref}
      title={title}
      subtitle={
        toolKind === 'mcp' || toolKind === 'subWorkflow'
          ? undefined
          : toolKind && !connectorLoading
            ? detail
            : getOperationNodeSubtitle(intl, operationType, operationKind, connectorName, isTrigger, connectorLoading)
      }
      icon={cardIcon}
      selectedIcon={selectedIcon}
      selected={isSelected}
      status={status}
      statusDetail={runData?.duration}
      strings={cardStrings}
      {...(toolKind ? { kind: toolKind, size: 'small' as const } : { handles: false })}
      handleAxis="vertical"
      role="button"
      tabIndex={nodeIndex}
      id={`msla-node-${id}`}
      aria-label={toolAltText ?? cardAltText}
      aria-pressed={toolKind ? !!isSelected : undefined}
      aria-busy={primaryLoading || isLoadingDynamicData || undefined}
      className={mergeClasses(!active && styles.inactive, isPinned && styles.pinned, copilotModified && hostStyles.copilotModified)}
      data-pinned={isPinned || undefined}
      data-copilot-modified={copilotModified || undefined}
      data-testid={`card-${title}`}
      data-automation-id={`card-${replaceWhiteSpaceWithUnderscore(title)}`}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      onContextMenu={onContextMenu}
      onKeyDown={keyboard.keyDown}
      onKeyUp={keyboard.keyUp}
      style={{ '--designer-ui-v2-node-text-end-reserve': `${indicatorCount * 20}px` } as CSSProperties}
      after={
        <>
          {primaryLoading ? <span className={styles.progress} role="progressbar" aria-label={loadingLabel} /> : null}
          {!status && errors.length > 0 ? <CardErrorBadge messages={errors} /> : null}
          {isLoadingDynamicData ? (
            <span className={styles.dynamic}>
              <Spinner size="extra-tiny" aria-label={loadingLabel} />
            </span>
          ) : null}
          <CardIndicatorBadges
            comment={comment}
            isSecureInputsOutputs={isSecureInputsOutputs}
            nodeIndex={nodeIndex}
            staticResultsEnabled={staticResultsEnabled}
          />
        </>
      }
    />
  );
  return toolKind ? (
    card
  ) : (
    <SharedNodeHoverCard
      category={isTrigger ? 'trigger' : 'action'}
      icon={cardIcon}
      title={title}
      subtitle={detail}
      configured={!status && errors.length === 0}
      description={description}
      disabled={isSelected || isDragging || isMonitoringView}
    >
      {card}
    </SharedNodeHoverCard>
  );
});
