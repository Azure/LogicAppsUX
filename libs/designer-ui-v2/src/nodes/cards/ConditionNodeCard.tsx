import { forwardRef, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';
import { ArrowTurnRightFilled, ArrowTurnRightRegular } from '@fluentui/react-icons';
import { nodeCardVars } from '../../theme/tokens';
import { NodeCard } from '../primitives/NodeCard';
import type { NodeHandleAxis } from '../primitives/NodeHandle';
import { NodeBranchOutputs } from '../primitives/NodeBranchOutputs';
import { NodeCardBody } from '../primitives/NodeCardBody';
import { NodeInputHandle, NodeOutputHandles } from '../primitives/NodeHandle';
import { NodeIconTile } from '../primitives/NodeIconTile';
import { NodeText } from '../primitives/NodeText';
import type { ConditionNodeKind, NodeHandleVariant } from '../types';
import type { ActionNodeCardStrings, NodeStrings } from '../strings';
import { defaultNodeStrings } from '../strings';
import { getSwitchNodeSize, nodeMetrics } from '../metrics';
import { categoryNodeIcons } from './categoryIcons';
import { resolveNodeIcons } from './shared';
import { useNodeCount } from '../countLabel';
import type { BaseNodeCardProps } from './shared';
const IF_BRANCHES = ['true', 'false'] as const;
const ICONS = {
  if: categoryNodeIcons.control,
  switch: { icon: <ArrowTurnRightRegular />, selectedIcon: <ArrowTurnRightFilled /> },
};
const useStyles = makeStyles({
  action: {
    position: 'absolute',
    top: tokens.spacingVerticalXS,
    insetInlineEnd: tokens.spacingHorizontalXS,
    display: 'inline-flex',
    zIndex: 1,
  },
  actionReserve: {
    // Keep the title and subtitle clear of the top-end host action (for example, "add case").
    [nodeCardVars.textEndReserve]: tokens.spacingHorizontalXL,
  },
  trunkHandles: {
    position: 'absolute',
    top: '50%',
    insetInlineEnd: `calc(-1 * ${tokens.strokeWidthThin})`,
    transform: 'translateY(-50%)',
    display: 'inline-flex',
    alignItems: 'center',
  },
  trunkTick: {
    position: 'relative',
    display: 'block',
    width: tokens.strokeWidthThin,
    height: `${nodeMetrics.handle.size}px`,
    backgroundColor: tokens.colorNeutralStroke1,
    '@media (forced-colors: active)': { backgroundColor: 'CanvasText' },
  },
  trunkSlot: {
    position: 'absolute',
    top: '50%',
    insetInlineEnd: '0',
    width: `${nodeMetrics.handle.size}px`,
    height: `${nodeMetrics.handle.size}px`,
    transform: 'translateY(-50%)',
  },
  trunkHandlesVertical: {
    position: 'absolute',
    left: '50%',
    bottom: `calc(-1 * ${tokens.strokeWidthThin})`,
    transform: 'translateX(-50%)',
    display: 'inline-flex',
    justifyContent: 'center',
  },
  trunkTickVertical: {
    position: 'relative',
    display: 'block',
    width: `${nodeMetrics.handle.size}px`,
    height: tokens.strokeWidthThin,
    backgroundColor: tokens.colorNeutralStroke1,
    '@media (forced-colors: active)': { backgroundColor: 'CanvasText' },
  },
  trunkSlotVertical: {
    position: 'absolute',
    left: '50%',
    bottom: '0',
    width: `${nodeMetrics.handle.size}px`,
    height: `${nodeMetrics.handle.size}px`,
    transform: 'translateX(-50%)',
  },
});
const renderTrunkOutputs = (axis: NodeHandleAxis, outputSlots: readonly ReactNode[] | undefined, styles: ReturnType<typeof useStyles>) => {
  const slots = outputSlots && outputSlots.length > 0 ? outputSlots : [undefined];
  const hasVisibleSlot = slots.some((slot) => slot != null);
  const vertical = axis === 'vertical';
  return (
    <span
      className={vertical ? styles.trunkHandlesVertical : styles.trunkHandles}
      data-testid="node-output-handles"
      data-axis={axis}
      data-mode="trunk"
    >
      <span className={vertical ? styles.trunkTickVertical : styles.trunkTick} data-handle="neutral" aria-hidden="true" />
      {/* The tick is decoration only. All semantic ports share its anchor without inheriting aria-hidden. */}
      <span className={vertical ? styles.trunkSlotVertical : styles.trunkSlot} aria-hidden={hasVisibleSlot ? undefined : true}>
        {slots.map((slot, index) => (
          <span key={index} data-slot-index={index}>
            {slot}
          </span>
        ))}
      </span>
    </span>
  );
};
export interface ConditionNodeCardProps extends Omit<BaseNodeCardProps, 'strings'> {
  kind: ConditionNodeKind;
  handles?: boolean;
  caseCount?: number;
  mode?: 'multiOutput' | 'trunk';
  action?: ReactNode;
  inputVariant?: NodeHandleVariant;
  inputSlot?: ReactNode;
  outputSlots?: readonly ReactNode[];
  takenOutput?: number;
  strings?: ActionNodeCardStrings & { condition: NodeStrings['condition']; branch?: NodeStrings['branch'] };
}
export const ConditionNodeCard = forwardRef<HTMLDivElement, ConditionNodeCardProps>(function ConditionNodeCard(
  {
    kind,
    title,
    subtitle,
    subtitleKind,
    countLabel,
    icon,
    selectedIcon,
    iconTone,
    iconArtwork,
    selected,
    status,
    statusDetail,
    strings = defaultNodeStrings,
    caseCount = 4,
    mode = 'multiOutput',
    action,
    inputVariant,
    inputSlot,
    outputSlots,
    takenOutput,
    handleAxis,
    handles = true,
    className,
    ...rest
  },
  ref
) {
  const styles = useStyles();
  const axis: NodeHandleAxis = handleAxis === 'vertical' ? 'vertical' : 'horizontal';
  const trunkMode = kind === 'switch' && mode === 'trunk';
  const switchOutputs: readonly NodeHandleVariant[] = useMemo(
    // A trunk has one visual tick regardless of semantic case count; it must not allocate case-count dots.
    () =>
      trunkMode
        ? []
        : Array.from({ length: Number.isFinite(caseCount) ? Math.max(1, Math.floor(caseCount)) : 1 }, () => 'neutral' as const),
    [caseCount, trunkMode]
  );
  const testData = status === 'mock';
  // `canEdit && <Button />` yields `false`; treat it as absent so no empty reserve/span is rendered.
  const hasAction = action != null && action !== false;
  const textEndReserve: CSSProperties | undefined =
    hasAction && testData
      ? ({ [nodeCardVars.textEndReserve]: `max(${tokens.spacingHorizontalXL}, ${nodeMetrics.testData.textReserve}px)` } as CSSProperties)
      : undefined;
  const nodeCount = useNodeCount(countLabel, strings, rest['aria-describedby']);
  return (
    <NodeCard
      {...rest}
      aria-describedby={nodeCount.describedBy}
      ref={ref}
      width="compact"
      size={kind === 'switch' && axis !== 'vertical' && !trunkMode ? 'switch' : 'medium'}
      bodyHeight={kind === 'switch' && axis !== 'vertical' && !trunkMode ? getSwitchNodeSize(caseCount, 'horizontal').height : undefined}
      handleAxis={handleAxis}
      selected={selected}
      status={status}
      statusDetail={statusDetail}
      strings={strings}
      data-node-card={kind}
      className={mergeClasses(hasAction && styles.actionReserve, className)}
    >
      <NodeCardBody testData={testData} testDataLabel={strings.status.mock} style={textEndReserve}>
        {/* Hiding preview decoration must not delete host-owned real connection attachments. */}
        {handles ? <NodeInputHandle variant={inputVariant}>{inputSlot}</NodeInputHandle> : inputSlot}
        <NodeIconTile
          category="control"
          selected={selected}
          testData={testData}
          tone={iconTone}
          artwork={iconArtwork}
          {...resolveNodeIcons({ icon, selectedIcon }, ICONS[kind])}
        />
        <NodeText title={title} subtitle={subtitle ?? strings.condition[kind]} subtitleKind={subtitleKind} {...nodeCount.textProps} />
        {handles ? (
          kind === 'if' ? (
            <NodeBranchOutputs
              branches={IF_BRANCHES}
              labels={strings.branch ? [strings.branch.true, strings.branch.false] : undefined}
              slots={outputSlots}
              activeIndex={takenOutput}
              takenLabel={strings.branch?.taken}
            />
          ) : trunkMode ? (
            renderTrunkOutputs(axis, outputSlots, styles)
          ) : (
            <NodeOutputHandles handles={switchOutputs} spacing="tight" slots={outputSlots} activeIndex={takenOutput} />
          )
        ) : (
          outputSlots
        )}
      </NodeCardBody>
      {hasAction ? <span className={styles.action}>{action}</span> : null}
    </NodeCard>
  );
});
