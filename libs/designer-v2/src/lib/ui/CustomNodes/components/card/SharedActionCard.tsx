import {
  ActionNodeCard,
  ToolItemCard,
  TriggerNodeCard,
  NODE_HOVER_CARD_IGNORE_ATTRIBUTE,
  type NodeToolKind,
} from '@microsoft/designer-ui-v2';
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
  getSharedCardAccessibleName,
  mapSharedRunPresentation,
  mapToolNodeStrings,
} from './nodeUiStrings';
import { useCardStyles } from './card.styles';
import { useOperationNodeIcon } from './useOperationNodeIcon';
import { SharedNodeHoverCard } from './SharedNodeHoverCard';

const useStyles = makeStyles({
  pinned: { outline: `2px solid ${tokens.colorPalettePumpkinBorderActive}`, outlineOffset: '2px' },
  dynamic: { position: 'absolute', top: '8px', right: '8px' },
  progress: { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clipPath: 'inset(50%)' },
  after: { display: 'contents' },
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
  handleAxis?: 'vertical' | 'horizontal';
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
    handleAxis = 'vertical',
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
  // One mapper yields the shared tone plus a truthful label (Waiting, Resuming, TimedOut, raw unknowns)
  // so the localized status dictionary is never cloned per card.
  const runPresentation = mapSharedRunPresentation(runData?.status, intl);
  const { status, label: statusLabel } = runPresentation;
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
    tone: iconTone,
    artwork: iconArtwork,
    connectorLoading,
  } = useOperationNodeIcon(operationType, operationKind, icon, primaryLoading);
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
  const cardStrings = useMemo(() => ({ ...strings, tool: mapToolNodeStrings(intl).tool }), [intl, strings]);
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
      iconTone={iconTone}
      iconArtwork={iconArtwork}
      selected={isSelected}
      status={status}
      statusLabel={statusLabel}
      statusDetail={runData?.duration}
      strings={cardStrings}
      inactive={!active}
      {...(toolKind ? { kind: toolKind, size: 'small' as const } : { handles: false })}
      handleAxis={handleAxis}
      role="button"
      tabIndex={nodeIndex}
      id={`msla-node-${id}`}
      aria-label={getSharedCardAccessibleName(intl, toolAltText ?? cardAltText, runPresentation, cardStrings.status, runData?.duration)}
      aria-pressed={toolKind ? !!isSelected : undefined}
      aria-busy={primaryLoading || isLoadingDynamicData || undefined}
      className={mergeClasses(isPinned && styles.pinned, copilotModified && hostStyles.copilotModified)}
      data-pinned={isPinned || undefined}
      data-copilot-modified={copilotModified || undefined}
      data-testid={`card-${title}`}
      data-automation-id={`card-${replaceWhiteSpaceWithUnderscore(title)}`}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      onContextMenu={onContextMenu}
      onKeyDown={(event) => {
        // Focusable after badges own their keyboard gestures; only the card itself invokes canvas commands.
        if (event.target === event.currentTarget) {
          keyboard.keyDown(event);
        }
      }}
      onKeyUp={(event) => {
        if (event.target === event.currentTarget) {
          keyboard.keyUp(event);
        }
      }}
      style={{ '--designer-ui-v2-node-text-end-reserve': `${indicatorCount * 20}px` } as CSSProperties}
      after={
        // A layout-neutral boundary excludes badges from rich hover while preserving their own tooltips.
        <span className={styles.after} {...{ [NODE_HOVER_CARD_IGNORE_ATTRIBUTE]: true }}>
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
        </span>
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
