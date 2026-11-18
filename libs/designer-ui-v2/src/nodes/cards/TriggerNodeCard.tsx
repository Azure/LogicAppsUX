import { forwardRef } from 'react';
import { NodeCard } from '../primitives/NodeCard';
import { NodeCardBody } from '../primitives/NodeCardBody';
import { NodeOutputHandles } from '../primitives/NodeHandle';
import { NodeIconTile } from '../primitives/NodeIconTile';
import { NodeText } from '../primitives/NodeText';
import { defaultNodeStrings } from '../strings';
import { categoryNodeIcons } from './categoryIcons';
import { resolveCardDensity, resolveNodeIcons } from './shared';
import type { BaseNodeCardProps, CompactNodeCardProps } from './shared';
export interface TriggerNodeCardProps extends BaseNodeCardProps, CompactNodeCardProps {
  handles?: boolean;
}
const OUTPUTS = ['neutral'] as const;
export const TriggerNodeCard = forwardRef<HTMLDivElement, TriggerNodeCardProps>(function TriggerNodeCard(
  {
    title,
    subtitle,
    icon,
    selectedIcon,
    selected,
    status,
    statusDetail,
    strings = defaultNodeStrings,
    handles = true,
    density,
    titleLines,
    ...rest
  },
  ref
) {
  const layout = resolveCardDensity({ density, titleLines });
  // Triggers consume saved sample *input*; they never substitute output, so `mock` is forwarded for status-union
  // compatibility without the action-only beaker paint.
  return (
    <NodeCard
      {...rest}
      ref={ref}
      shape="pill"
      width={layout.width}
      size={layout.size}
      selected={selected}
      status={status}
      statusDetail={statusDetail}
      strings={strings}
      data-node-card="trigger"
    >
      <NodeCardBody density={layout.body}>
        <NodeIconTile
          category="trigger"
          size={layout.tile}
          selected={selected}
          {...resolveNodeIcons({ icon, selectedIcon }, categoryNodeIcons.trigger)}
        />
        <NodeText title={title} subtitle={subtitle} titleLines={layout.titleLines} />
        {handles ? <NodeOutputHandles handles={OUTPUTS} /> : null}
      </NodeCardBody>
    </NodeCard>
  );
});
