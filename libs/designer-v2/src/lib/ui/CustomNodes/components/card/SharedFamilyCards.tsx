import {
  ActionNodeCard,
  AgentNodeCard,
  AgentToolsPanel,
  ConditionNodeCard,
  LoopNodeCard,
  NodeInactiveContext,
  NodeBranchLabel,
  NodeBranchActions,
  NodeBranchShell,
  NODE_BRANCH_ACTIONS_MAX_RESERVE_PX,
  NodeText,
  ToolItemCard,
  getCompactTitleLines,
  useLoopBodyHoverClass,
  type NodeBranchActionItem,
  type NodeIconTone,
  type NodeFrameCountLabel,
} from '@microsoft/designer-ui-v2';
import type { CompactTitleLines } from '@microsoft/designer-ui-v2/metrics';
import { Button, makeStyles, mergeClasses, tokens, useMergedRefs, useRestoreFocusTarget } from '@fluentui/react-components';
import {
  CheckmarkRegular,
  ChevronDownRegular,
  ChevronRightRegular,
  DismissRegular,
  EditRegular,
  FlowRegular,
  MoreHorizontalRegular,
  PlugConnectedRegular,
} from '@fluentui/react-icons';
import { replaceWhiteSpaceWithUnderscore, SUBGRAPH_TYPES, type SubgraphType } from '@microsoft/logic-apps-shared';
import { useContext, useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useIntl } from 'react-intl';
import type { ActionCardProps } from './actionCard';
import { useKeyboardInteraction } from './keyboardInteraction';
import { CardErrorBadge } from './cardErrorBadge';
import { CardIndicatorBadges } from './cardIndicatorBadges';
import {
  mapActionNodeStrings,
  mapAgentNodeStrings,
  mapConditionNodeStrings,
  mapLoopNodeStrings,
  getSharedCardAccessibleName,
  mapSharedRunPresentation,
  mapSharedRunVisuals,
  mapToolNodeStrings,
} from './nodeUiStrings';
import { agentNodeTone, getControlOperationGlyph, scopeNodeIcon } from './operationNodeGlyphs';
import { getNodePresentation, SHARED_SCOPE_TITLE_RESERVE, type NodePresentation } from '../../../../core/utils/graph';
import { SharedNodeHoverCard } from './SharedNodeHoverCard';
import { useOperationParameterByName } from '../../../../core/state/operation/operationSelector';
import { WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';

const useStyles = makeStyles({
  pinned: { outline: `2px solid ${tokens.colorPalettePumpkinBorderActive}`, outlineOffset: '2px' },
  collapse: { position: 'absolute', top: '4px', right: '4px', minWidth: 0 },
  branchLabel: { justifyContent: 'center', minWidth: 0 },
  branchError: { top: '50%', right: 'auto', insetInlineStart: tokens.spacingHorizontalS, transform: 'translateY(-50%)' },
  collapseWithActions: { insetInlineEnd: `${NODE_BRANCH_ACTIONS_MAX_RESERVE_PX + 4}px` },
  acceptedFrame: { width: '100%' },
  pagerSlot: { display: 'inline-flex', height: '20px', alignItems: 'center' },
});

export const FamilyCollapseButton = ({
  collapsed,
  onCollapse,
  id,
  tabIndex,
  className,
}: {
  collapsed?: boolean;
  onCollapse?: (includeNested?: boolean) => void;
  id?: string;
  tabIndex?: number;
  className?: string;
}) => {
  const intl = useIntl();
  const styles = useStyles();
  const label = collapsed
    ? intl.formatMessage({ defaultMessage: 'Expand', id: 'Ug4sWZ', description: 'Expand to make the node bigger and show the contents.' })
    : intl.formatMessage({
        defaultMessage: 'Collapse',
        id: '0Vzp0l',
        description: 'Collapse, making the node smaller, hiding the contents',
      });
  return (
    <Button
      id={id}
      className={mergeClasses('nodrag', styles.collapse, className)}
      appearance="subtle"
      shape="circular"
      size="small"
      icon={collapsed ? <ChevronRightRegular /> : <ChevronDownRegular />}
      aria-label={label}
      aria-expanded={!collapsed}
      tabIndex={tabIndex}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onCollapse?.(event.shiftKey);
      }}
    />
  );
};

interface SharedScopeCardProps extends ActionCardProps {
  family: NodePresentation['family'];
  operationType?: string;
  handleAxis?: 'vertical' | 'horizontal';
  inputSlot?: ReactNode;
  outputSlots?: readonly ReactNode[];
  model?: string;
  footerAction?: ReactNode;
  caseCount?: number;
  description?: string;
  isMonitoringView?: boolean;
  toolsPanel?: { width: number; height: number; bottomPadding: number; collapsed?: boolean; items: { id: string }[] };
  /** Title clamp ELK sized the scope header for. */
  titleLines?: CompactTitleLines;
  /** Collapsed-container count rendered by the shared card text (unit picks the localized noun). */
  countLabel?: NodeFrameCountLabel;
  /**
   * Selected output index from authoritative runtime data for this exact run/repetition.
   * Omit when runtime evidence is unavailable.
   */
  takenOutput?: number;
}

export const SharedAgentScopeCard = (props: SharedScopeCardProps) => {
  const parameter = useOperationParameterByName(props.id, 'deploymentId');
  const liveModel = parameter ? parameter.value.map((segment) => segment.value).join('') : props.model;
  return <SharedScopeCard {...props} model={liveModel || undefined} />;
};

/** Host interaction adapter; canonical cards own their visible surface. */
export const SharedScopeCard = ({
  family,
  operationType,
  handleAxis = 'vertical',
  inputSlot,
  outputSlots,
  model,
  footerAction,
  caseCount,
  description,
  isMonitoringView,
  toolsPanel,
  countLabel,
  takenOutput,
  ...props
}: SharedScopeCardProps) => {
  const intl = useIntl();
  const styles = useStyles();
  const loopHeaderHoverClass = useLoopBodyHoverClass('header');
  const focusRef = useRef<HTMLDivElement>(null);
  const ref = useMergedRefs(focusRef, props.rootRef, (node: HTMLDivElement | null) => {
    props.drag(node);
    props.dragPreview(node);
  });
  const restoreFocus = useRestoreFocusTarget();
  const keyboard = useKeyboardInteraction(props.onClick, props.onDeleteClick, props.onCopyClick);
  useEffect(() => {
    if (props.setFocus) {
      focusRef.current?.focus({ preventScroll: true });
    }
  }, [props.setFocus]);
  const actionStrings = mapActionNodeStrings(intl);
  const runPresentation = mapSharedRunPresentation(props.runData?.status, intl);
  const runVisuals = mapSharedRunVisuals(props.runData?.status);
  const { status, label: statusLabel } = runPresentation;
  const containsStatus = !!isMonitoringView && !!status;
  const collapse = (
    <FamilyCollapseButton
      id={`${props.id}-collapse-toggle`}
      collapsed={props.collapsed}
      onCollapse={props.handleCollapse}
      tabIndex={props.nodeIndex}
    />
  );
  const common = {
    ...restoreFocus,
    ref,
    title: props.title,
    selected: props.isSelected,
    status,
    statusLabel,
    statusDetail: props.runData?.duration,
    statusDisplay: containsStatus ? ('contained' as const) : ('badge' as const),
    statusTone: containsStatus ? runVisuals.statusTone : undefined,
    statusTint: containsStatus && runVisuals.failedTint ? ('failed' as const) : ('none' as const),
    inactive: props.active === false,
    handleAxis,
    countLabel,
    id: `msla-node-${props.id}`,
    role: 'button',
    tabIndex: props.nodeIndex,
    'aria-label': getSharedCardAccessibleName(intl, props.title, runPresentation, actionStrings.status, props.runData?.duration),
    'aria-busy': props.isLoading || undefined,
    'data-node-id': props.id,
    'data-testid': `card-${props.title}`,
    'data-automation-id': `card-${replaceWhiteSpaceWithUnderscore(props.title)}`,
    className: mergeClasses(props.isPinned && styles.pinned),
    style: { marginInline: 'auto' },
    onClick: (event: React.MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      props.onClick?.(event);
    },
    onContextMenu: props.onContextMenu,
    onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        keyboard.keyDown(event);
      }
    },
    onKeyUp: (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        keyboard.keyUp(event);
      }
    },
    after: (
      <>
        {!status && props.errorMessages?.length ? <CardErrorBadge messages={props.errorMessages} /> : null}
        <CardIndicatorBadges comment={props.comment} nodeIndex={props.nodeIndex} />
        {collapse}
      </>
    ),
  };
  const hoverCategory = family === 'agent' ? 'agent' : family === 'scope' ? 'action' : 'control';
  const hoverIcon =
    family === 'if' || family === 'switch'
      ? getControlOperationGlyph(family)?.icon
      : family === 'loop'
        ? getControlOperationGlyph('foreach')?.icon
        : family === 'scope'
          ? scopeNodeIcon
          : undefined;
  const withHover = (card: ReactNode) => (
    <SharedNodeHoverCard
      // The fixed-width Agent header must center in its accepted frame, not a shrink-wrapped hover trigger.
      className={family === 'agent' && toolsPanel ? styles.acceptedFrame : undefined}
      category={hoverCategory}
      icon={hoverIcon}
      title={props.title}
      subtitle={operationType}
      description={description}
      configured={!props.isLoading && !props.errorMessages?.length && (family !== 'agent' || !!model)}
      disabled={props.isSelected || props.isDragging || isMonitoringView}
    >
      {card}
    </SharedNodeHoverCard>
  );
  if (family === 'if' || family === 'switch') {
    return withHover(
      <ConditionNodeCard
        {...common}
        {...getControlOperationGlyph(family)}
        headerTint={family === 'if' ? 'condition' : 'switch'}
        kind={family}
        subtitleKind={containsStatus ? 'status' : undefined}
        // Standard keeps explicit true/false (or case) exits as first-class branch nodes, so trunk mode is invalid here.
        mode="multiOutput"
        caseCount={caseCount}
        strings={mapConditionNodeStrings(intl)}
        inputSlot={inputSlot}
        outputSlots={outputSlots}
        takenOutput={takenOutput}
      />
    );
  }
  if (family === 'loop') {
    const strings = mapLoopNodeStrings(intl, operationType);
    const joined = operationType?.toLowerCase() === 'foreach' && !props.collapsed;
    return withHover(
      <LoopNodeCard
        {...common}
        {...getControlOperationGlyph('foreach')}
        className={mergeClasses(common.className, joined && loopHeaderHoverClass)}
        data-loop-group-header={joined ? props.id : undefined}
        headerTint="loop"
        density="compact"
        prioritizeTitle
        titleLines={
          props.titleLines ??
          getNodePresentation(WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE, true, { operationType: operationType ?? 'foreach', title: props.title })
            .titleLines
        }
        style={{ ...common.style, '--designer-ui-v2-node-text-end-reserve': `${SHARED_SCOPE_TITLE_RESERVE}px` } as CSSProperties}
        subtitle={containsStatus ? undefined : strings.loop.foreach}
        subtitleKind={containsStatus ? 'status' : undefined}
        bodyPlacement="none"
        strings={strings}
        inputSlot={inputSlot}
        outputSlots={outputSlots}
        iterationPager={footerAction}
      />
    );
  }
  if (family === 'agent') {
    const strings = mapAgentNodeStrings(intl);
    const { tools, addTool } = strings.agent;
    return withHover(
      <AgentNodeCard
        {...common}
        iconTone={agentNodeTone}
        subtitleKind={containsStatus ? 'status' : undefined}
        model={model}
        // The host owns stacked tool rows below the Agent header; side placement belongs to Otto topology follow-ups.
        toolsPlacement="below"
        footerAction={footerAction ? <span className={styles.pagerSlot}>{footerAction}</span> : undefined}
        strings={strings}
        inputSlot={inputSlot}
        outputSlot={outputSlots?.[0]}
        toolsPanelSlot={
          toolsPanel ? (
            <div
              style={{
                width: toolsPanel.width,
                marginInlineStart: `calc((100% - ${toolsPanel.width}px) / 2)`,
                paddingBottom: toolsPanel.bottomPadding,
              }}
            >
              <AgentToolsPanel
                style={{ width: toolsPanel.width, height: toolsPanel.height }}
                surface="transparent"
                strings={{
                  heading: () =>
                    intl.formatMessage(
                      { defaultMessage: 'Tools ({count})', id: 'Fe84tQ', description: 'Agent tools panel heading with actual tool count' },
                      { count: toolsPanel.items.length }
                    ),
                  addTools: addTool,
                  collapseTools: tools,
                  expandTools: tools,
                  add: addTool,
                }}
                data-agent-id={props.id}
                role="group"
                aria-owns={toolsPanel.collapsed ? undefined : toolsPanel.items.map((item) => `msla-node-${item.id}`).join(' ') || undefined}
                expanded={false}
              />
            </div>
          ) : undefined
        }
      />
    );
  }
  return withHover(
    <ActionNodeCard
      {...common}
      headerTint="scope"
      strings={actionStrings}
      subtitleKind={containsStatus ? 'status' : undefined}
      handles={false}
      icon={scopeNodeIcon}
      density="compact"
      prioritizeTitle
      style={{ ...common.style, '--designer-ui-v2-node-text-end-reserve': `${SHARED_SCOPE_TITLE_RESERVE}px` } as CSSProperties}
      titleLines={props.titleLines ?? getCompactTitleLines(props.title ?? '', SHARED_SCOPE_TITLE_RESERVE)}
    />
  );
};

interface SharedBranchCardProps {
  id: string;
  title: string;
  subgraphType: SubgraphType;
  selected?: boolean;
  pinned?: boolean;
  active?: boolean;
  collapsed?: boolean;
  nodeIndex?: number;
  errorMessages?: string[];
  descendantErrorCount?: number;
  onClick: () => void;
  onContextMenu?: React.MouseEventHandler<HTMLElement>;
  onDeleteClick?: () => void;
  onRenameClick?: () => void;
  onMoreClick?: (anchor: HTMLElement) => void;
  onCollapse?: (includeNested?: boolean) => void;
  runData?: ActionCardProps['runData'];
  description?: string;
  isMonitoringView?: boolean;
  toolKind?: NodePresentation['toolKind'];
  /** Tool identity resolved by the host (connector or MCP art, or a family glyph); omitted falls back to the tool-kind default. */
  icon?: ReactNode;
  selectedIcon?: ReactNode;
  iconTone?: NodeIconTone;
  iconArtwork?: boolean;
  handleAxis?: 'vertical' | 'horizontal';
  inputSlot?: ReactNode;
  outputSlot?: ReactNode;
  /** Collapsed count for tool rows; fixed-height branch headers have no second text line and ignore it. */
  countLabel?: NodeFrameCountLabel;
  /**
   * Host opt-in for a neutral false-branch identity. Defaults to legacy danger X so library defaults and legacy
   * paths remain unchanged.
   */
  falseBranchGlyph?: 'legacy' | 'neutral';
}

export const SharedBranchCard = (props: SharedBranchCardProps) => {
  const intl = useIntl();
  const styles = useStyles();
  // A branch header rendered inside an already-dimmed shared frame must not apply its own 0.4 again.
  const ancestorInactive = useContext(NodeInactiveContext);
  const isTrue = props.subgraphType === SUBGRAPH_TYPES.CONDITIONAL_TRUE;
  const conditional = isTrue || props.subgraphType === SUBGRAPH_TYPES.CONDITIONAL_FALSE;
  const compact = conditional || props.subgraphType === SUBGRAPH_TYPES.SWITCH_DEFAULT || props.subgraphType === SUBGRAPH_TYPES.UNTIL_DO;
  const isSwitchCase = props.subgraphType === SUBGRAPH_TYPES.SWITCH_CASE;
  const renameCaseLabel = intl.formatMessage({
    defaultMessage: 'Rename case',
    id: 'j2TDoU',
    description: 'Accessible label for the switch-case rename action',
  });
  const moreCaseActionsLabel = intl.formatMessage({
    defaultMessage: 'More case actions',
    id: 'DZs1Ne',
    description: 'Accessible label for the switch-case overflow actions menu',
  });
  const caseActions: NodeBranchActionItem[] = isSwitchCase
    ? [
        ...(props.onRenameClick
          ? [
              {
                key: 'rename',
                icon: <EditRegular />,
                ariaLabel: renameCaseLabel,
                automationId: `branch-${props.id}-rename`,
                onInvoke: () => props.onRenameClick?.(),
              } satisfies NodeBranchActionItem,
            ]
          : []),
        ...(props.onMoreClick
          ? [
              {
                key: 'more',
                icon: <MoreHorizontalRegular />,
                ariaLabel: moreCaseActionsLabel,
                automationId: `branch-${props.id}-more`,
                hasPopup: true,
                onInvoke: (anchor) => props.onMoreClick?.(anchor),
              } satisfies NodeBranchActionItem,
            ]
          : []),
      ]
    : [];
  const hasCaseActions = caseActions.length > 0;
  const keyboard = useKeyboardInteraction(compact ? () => props.onCollapse?.() : props.onClick, props.onDeleteClick);
  const title = conditional
    ? isTrue
      ? intl.formatMessage({ defaultMessage: 'True', id: '/WW7If', description: 'True' })
      : intl.formatMessage({ defaultMessage: 'False', id: 'PXa0D4', description: 'False' })
    : props.subgraphType === SUBGRAPH_TYPES.SWITCH_DEFAULT
      ? intl.formatMessage({ defaultMessage: 'Default', id: 'FUuFlC', description: 'Default, the backup option if none other apply' })
      : props.subgraphType === SUBGRAPH_TYPES.UNTIL_DO
        ? intl.formatMessage({ defaultMessage: 'Do', id: 'c/+j08', description: 'Do, as in "to do an action"' })
        : props.title;
  const common = {
    id: props.subgraphType === SUBGRAPH_TYPES.UNTIL_DO ? undefined : `msla-node-${props.id}`,
    'data-node-id': props.id,
    'data-testid': `card-${props.title}`,
    'data-automation-id': `card-${replaceWhiteSpaceWithUnderscore(props.title)}`,
    role: 'button',
    tabIndex: props.nodeIndex,
    'aria-label': title,
    className: mergeClasses(props.pinned && styles.pinned),
    onClick: (event: React.MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (compact) {
        props.onCollapse?.(event.shiftKey);
      } else {
        props.onClick();
      }
    },
    onContextMenu: props.onContextMenu,
    onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        keyboard.keyDown(event);
      }
    },
    onKeyUp: (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        keyboard.keyUp(event);
      }
    },
  };
  const collapse = (
    <FamilyCollapseButton
      id={props.id}
      collapsed={props.collapsed}
      onCollapse={props.onCollapse}
      tabIndex={props.nodeIndex}
      className={hasCaseActions ? styles.collapseWithActions : undefined}
    />
  );
  if (props.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION || props.subgraphType === SUBGRAPH_TYPES.MCP_CLIENT) {
    const toolKind = props.toolKind ?? (props.subgraphType === SUBGRAPH_TYPES.MCP_CLIENT ? 'mcp' : 'action');
    const runPresentation = mapSharedRunPresentation(props.runData?.status, intl);
    const runVisuals = mapSharedRunVisuals(props.runData?.status);
    const { status, label: statusLabel } = runPresentation;
    const toolStrings = mapToolNodeStrings(intl);
    // Shared tool rows use contained status whenever run evidence exists to stay within their fixed 56px slot.
    const containsStatus = !!status && (!!props.isMonitoringView || toolKind !== undefined);
    return (
      <SharedNodeHoverCard
        // Small ToolItems fill their parent; constrain the hover trigger to the accepted header width.
        className={styles.acceptedFrame}
        category="action"
        icon={props.icon ?? (toolKind === 'mcp' ? <PlugConnectedRegular /> : toolKind === 'subWorkflow' ? <FlowRegular /> : undefined)}
        title={title}
        description={props.description}
        configured={!props.errorMessages?.length}
        disabled={props.selected || props.isMonitoringView}
      >
        <ToolItemCard
          {...common}
          aria-label={getSharedCardAccessibleName(
            intl,
            intl.formatMessage(
              {
                defaultMessage: '{kind, select, mcp {MCP tool} other {Tool}}: {name}',
                id: 'Djf6IE',
                description: 'Accessible name of an Agent tool row',
              },
              { kind: toolKind, name: title }
            ),
            runPresentation,
            toolStrings.status,
            props.runData?.duration
          )}
          aria-pressed={props.selected ?? false}
          title={title}
          subtitleKind={containsStatus ? 'status' : undefined}
          selected={props.selected}
          status={status}
          statusLabel={statusLabel}
          statusDetail={props.runData?.duration}
          statusDisplay={containsStatus ? 'contained' : 'badge'}
          statusTone={containsStatus ? runVisuals.statusTone : undefined}
          statusTint={containsStatus && runVisuals.failedTint ? 'failed' : 'none'}
          inactive={props.active === false}
          kind={toolKind}
          icon={props.icon}
          selectedIcon={props.selectedIcon}
          iconTone={props.iconTone}
          iconArtwork={props.iconArtwork}
          countLabel={props.countLabel}
          size="small"
          strings={toolStrings}
          after={
            <>
              {props.inputSlot}
              {props.outputSlot}
              {!status && props.errorMessages?.length ? <CardErrorBadge messages={props.errorMessages} /> : null}
              {collapse}
            </>
          }
          handleAxis={props.handleAxis ?? 'vertical'}
        />
      </SharedNodeHoverCard>
    );
  }
  const errors = [...(props.errorMessages ?? [])];
  if (props.descendantErrorCount) {
    errors.push(
      intl.formatMessage(
        {
          defaultMessage: '{count, plural, one {# nested step has validation errors} other {# nested steps have validation errors}}',
          id: 'qMz2QQ',
          description: 'Validation summary on a branch when steps inside it have errors',
        },
        { count: props.descendantErrorCount }
      )
    );
  }
  return (
    <NodeBranchShell
      {...common}
      aria-description={errors.length ? errors.join('\n') : undefined}
      data-automation-id={compact ? `${props.id}-collapse-toggle-small` : common['data-automation-id']}
      hasActions={hasCaseActions}
      tone={conditional ? (isTrue ? 'success' : 'danger') : props.subgraphType === SUBGRAPH_TYPES.UNTIL_DO ? 'info' : 'neutral'}
      selected={props.selected}
      inactive={props.active === false}
      ancestorInactive={ancestorInactive}
    >
      {conditional ? (
        <NodeBranchLabel
          className={styles.branchLabel}
          tone={isTrue ? 'success' : props.falseBranchGlyph === 'neutral' ? 'neutral' : 'danger'}
          icon={isTrue ? <CheckmarkRegular /> : props.falseBranchGlyph === 'neutral' ? undefined : <DismissRegular />}
          label={title}
          data-branch={isTrue ? 'true' : 'false'}
        />
      ) : (
        <NodeText title={title} />
      )}
      {hasCaseActions ? <NodeBranchActions items={caseActions} /> : null}
      {errors.length ? <CardErrorBadge className={styles.branchError} messages={errors} /> : null}
      {collapse}
    </NodeBranchShell>
  );
};
