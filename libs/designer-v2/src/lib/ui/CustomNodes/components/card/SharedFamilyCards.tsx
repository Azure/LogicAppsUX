import {
  ActionNodeCard,
  AgentNodeCard,
  AgentToolsPanel,
  ConditionNodeCard,
  LoopNodeCard,
  NodeInactiveContext,
  NodeLabeledHandle,
  NodeText,
  ToolItemCard,
  getCompactTitleLines,
  type NodeFrameCountLabel,
} from '@microsoft/designer-ui-v2';
import type { CompactTitleLines } from '@microsoft/designer-ui-v2/metrics';
import { Button, makeStyles, mergeClasses, tokens, useMergedRefs, useRestoreFocusTarget } from '@fluentui/react-components';
import { ChevronDownRegular, ChevronRightRegular, FlowRegular, PlugConnectedRegular } from '@fluentui/react-icons';
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
  mapToolNodeStrings,
} from './nodeUiStrings';
import { nodeMetrics } from '@microsoft/designer-ui-v2/metrics';
import { scopeNodeIcon } from './operationNodeGlyphs';
import { SHARED_SCOPE_TITLE_RESERVE, type NodePresentation } from '../../../../core/utils/graph';
import { SharedNodeHoverCard } from './SharedNodeHoverCard';
import { useOperationParameterByName } from '../../../../core/state/operation/operationSelector';

const useStyles = makeStyles({
  // Plain branch labels are not shared NodeCards, so mirror the card's inactive dimming from shared metrics.
  inactive: { opacity: nodeMetrics.inactiveOpacity },
  pinned: { outline: `2px solid ${tokens.colorPalettePumpkinBorderActive}`, outlineOffset: '2px' },
  collapse: { position: 'absolute', top: '4px', right: '4px', minWidth: 0 },
  branch: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' },
  acceptedFrame: { width: '100%' },
  pagerSlot: { display: 'inline-flex', height: '20px', alignItems: 'center' },
});

export const FamilyCollapseButton = ({
  collapsed,
  onCollapse,
  id,
  tabIndex,
}: {
  collapsed?: boolean;
  onCollapse?: (includeNested?: boolean) => void;
  id?: string;
  tabIndex?: number;
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
      className={mergeClasses('nodrag', styles.collapse)}
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
  ...props
}: SharedScopeCardProps) => {
  const intl = useIntl();
  const styles = useStyles();
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
  const { status, label: statusLabel } = runPresentation;
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
  const withHover = (card: ReactNode) => (
    <SharedNodeHoverCard
      // The fixed-width Agent header must center in its accepted frame, not a shrink-wrapped hover trigger.
      className={family === 'agent' && toolsPanel ? styles.acceptedFrame : undefined}
      category={family === 'agent' ? 'agent' : 'control'}
      icon={undefined}
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
        kind={family}
        // Standard keeps explicit true/false (or case) exits as first-class branch nodes, so trunk mode is invalid here.
        mode="multiOutput"
        caseCount={caseCount}
        strings={mapConditionNodeStrings(intl)}
        inputSlot={inputSlot}
        outputSlots={outputSlots}
      />
    );
  }
  if (family === 'loop') {
    const strings = mapLoopNodeStrings(intl, operationType);
    return withHover(
      <LoopNodeCard
        {...common}
        subtitle={strings.loop.foreach}
        bodyPlacement="none"
        strings={strings}
        inputSlot={inputSlot}
        outputSlots={outputSlots}
      />
    );
  }
  if (family === 'agent') {
    const strings = mapAgentNodeStrings(intl);
    const { tools, addTool } = strings.agent;
    return withHover(
      <AgentNodeCard
        {...common}
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
      strings={actionStrings}
      handles={false}
      icon={scopeNodeIcon}
      density="compact"
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
  onClick: () => void;
  onContextMenu?: React.MouseEventHandler<HTMLElement>;
  onDeleteClick?: () => void;
  onCollapse?: (includeNested?: boolean) => void;
  runData?: ActionCardProps['runData'];
  description?: string;
  isMonitoringView?: boolean;
  toolKind?: NodePresentation['toolKind'];
  handleAxis?: 'vertical' | 'horizontal';
  inputSlot?: ReactNode;
  outputSlot?: ReactNode;
  /** Collapsed count for tool rows; fixed-height branch headers have no second text line and ignore it. */
  countLabel?: NodeFrameCountLabel;
}

export const SharedBranchCard = (props: SharedBranchCardProps) => {
  const intl = useIntl();
  const styles = useStyles();
  // A branch header rendered inside an already-dimmed shared frame must not apply its own 0.4 again.
  const ancestorInactive = useContext(NodeInactiveContext);
  const isTrue = props.subgraphType === SUBGRAPH_TYPES.CONDITIONAL_TRUE;
  const conditional = isTrue || props.subgraphType === SUBGRAPH_TYPES.CONDITIONAL_FALSE;
  const compact = conditional || props.subgraphType === SUBGRAPH_TYPES.SWITCH_DEFAULT || props.subgraphType === SUBGRAPH_TYPES.UNTIL_DO;
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
    <FamilyCollapseButton id={props.id} collapsed={props.collapsed} onCollapse={props.onCollapse} tabIndex={props.nodeIndex} />
  );
  if (props.subgraphType === SUBGRAPH_TYPES.AGENT_CONDITION || props.subgraphType === SUBGRAPH_TYPES.MCP_CLIENT) {
    const toolKind = props.toolKind ?? (props.subgraphType === SUBGRAPH_TYPES.MCP_CLIENT ? 'mcp' : 'action');
    const runPresentation = mapSharedRunPresentation(props.runData?.status, intl);
    const { status, label: statusLabel } = runPresentation;
    const toolStrings = mapToolNodeStrings(intl);
    return (
      <SharedNodeHoverCard
        // Small ToolItems fill their parent; constrain the hover trigger to the accepted header width.
        className={styles.acceptedFrame}
        category="action"
        icon={toolKind === 'mcp' ? <PlugConnectedRegular /> : toolKind === 'subWorkflow' ? <FlowRegular /> : undefined}
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
          selected={props.selected}
          status={status}
          statusLabel={statusLabel}
          statusDetail={props.runData?.duration}
          inactive={props.active === false}
          kind={toolKind}
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
  return (
    <div
      {...common}
      data-automation-id={compact ? `${props.id}-collapse-toggle-small` : common['data-automation-id']}
      className={mergeClasses(styles.branch, props.active === false && !ancestorInactive && styles.inactive, common.className)}
      data-inactive={props.active === false || undefined}
    >
      {conditional ? <NodeLabeledHandle branch={isTrue ? 'true' : 'false'} label={title} lineLength={0} /> : <NodeText title={title} />}
      {collapse}
    </div>
  );
};
