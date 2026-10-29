import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import { makeStyles } from '@fluentui/react-components';
import { ArrowRepeatAllFilled, ArrowRepeatAllRegular } from '@fluentui/react-icons';
import { NodeCard } from '../primitives/NodeCard';
import { NodeCardBody } from '../primitives/NodeCardBody';
import { NodeHandle, NodeInputHandle, NodeOutputHandles } from '../primitives/NodeHandle';
import { NodeIconTile } from '../primitives/NodeIconTile';
import { NodeText } from '../primitives/NodeText';
import type { LoopNodeCardStrings } from '../strings';
import { defaultNodeStrings } from '../strings';
import { resolveNodeIcons } from './shared';
import type { BaseNodeCardProps } from './shared';

const END_OUTPUTS = ['neutral', 'neutral'] as const;
const NEXT_OUTPUT = ['neutral'] as const;
const DEFAULT_ICONS = { icon: <ArrowRepeatAllRegular />, selectedIcon: <ArrowRepeatAllFilled /> };
const useStyles = makeStyles({
  bottom: { position: 'absolute', bottom: 0, left: '50%', transform: 'translate(-50%, 50%)', zIndex: 1 },
});

/** end: body/done outputs; bottom: body below and next trailing; none: next only. */
export type LoopBodyPlacement = 'end' | 'bottom' | 'none';
export interface LoopNodeCardProps extends Omit<BaseNodeCardProps, 'strings'> {
  handles?: boolean;
  bodyPlacement?: LoopBodyPlacement;
  inputSlot?: ReactNode;
  /** [body, done] for end; [next] otherwise. */
  outputSlots?: readonly ReactNode[];
  bodySlot?: ReactNode;
  /** Host control on the bottom edge, replacing the bottom body dot. */
  bodyToggle?: ReactNode;
  strings?: LoopNodeCardStrings;
}

/** Canonical Otto loop card; body contents and run paging belong in the host's frame. */
export const LoopNodeCard = forwardRef<HTMLDivElement, LoopNodeCardProps>(function LoopNodeCard(
  {
    title,
    subtitle,
    icon,
    selectedIcon,
    selected,
    status,
    statusDetail,
    bodyPlacement = 'end',
    inputSlot,
    outputSlots,
    bodySlot,
    bodyToggle,
    strings = defaultNodeStrings,
    handles = true,
    ...rest
  },
  ref
) {
  const styles = useStyles();
  const testData = status === 'mock';
  const bottom =
    bodyToggle != null ? (
      <span className={styles.bottom}>{bodyToggle}</span>
    ) : bodyPlacement === 'bottom' ? (
      <NodeHandle className={styles.bottom}>{bodySlot}</NodeHandle>
    ) : null;
  return (
    <NodeCard
      {...rest}
      ref={ref}
      width="compact"
      selected={selected}
      status={status}
      statusDetail={statusDetail}
      strings={strings}
      data-node-card="foreach"
      data-body-placement={bodyPlacement}
    >
      <NodeCardBody testData={testData} testDataLabel={strings.status.mock}>
        {handles ? <NodeInputHandle>{inputSlot}</NodeInputHandle> : null}
        <NodeIconTile
          category="control"
          selected={selected}
          testData={testData}
          {...resolveNodeIcons({ icon, selectedIcon }, DEFAULT_ICONS)}
        />
        <NodeText title={title} subtitle={subtitle ?? strings.loop.foreach} />
        {handles ? <NodeOutputHandles handles={bodyPlacement === 'end' ? END_OUTPUTS : NEXT_OUTPUT} slots={outputSlots} /> : null}
      </NodeCardBody>
      {handles ? bottom : null}
    </NodeCard>
  );
});
