import { forwardRef } from 'react';
import { NodeCard } from '../primitives/NodeCard';
import { NodeCardBody } from '../primitives/NodeCardBody';
import { NodeInputHandle, NodeOutputHandles } from '../primitives/NodeHandle';
import { NodeIconTile } from '../primitives/NodeIconTile';
import { NodeText } from '../primitives/NodeText';
import { defaultNodeStrings } from '../strings';
import type { NodeHandleVariant } from '../types';
import { categoryNodeIcons } from './categoryIcons';
import { useNodeCount } from '../countLabel';
import { resolveCardDensity, resolveNodeIcons } from './shared';
import type { BaseNodeCardProps, CompactNodeCardProps } from './shared';

export interface ActionNodeCardProps extends BaseNodeCardProps, CompactNodeCardProps {
  /** Visual dots only; disable when the host draws its own real handle affordances. */
  handles?: boolean;
  /** Colors only the input handle so host semantics can be emphasized without recoloring outputs. */
  inputVariant?: NodeHandleVariant;
}
const OUTPUTS = ['neutral'] as const;
export const ActionNodeCard = forwardRef<HTMLDivElement, ActionNodeCardProps>(function ActionNodeCard(
  {
    title,
    subtitle,
    subtitleKind,
    countLabel,
    icon,
    selectedIcon,
    selected,
    status,
    statusDetail,
    strings = defaultNodeStrings,
    handles = true,
    inputVariant,
    density,
    titleLines,
    ...rest
  },
  ref
) {
  const testData = status === 'mock';
  const layout = resolveCardDensity({ density, titleLines });
  const nodeCount = useNodeCount(countLabel, strings, rest['aria-describedby']);
  return (
    <NodeCard
      {...rest}
      aria-describedby={nodeCount.describedBy}
      ref={ref}
      width={layout.width}
      size={layout.size}
      selected={selected}
      status={status}
      statusDetail={statusDetail}
      strings={strings}
      data-node-card="action"
    >
      <NodeCardBody density={layout.body} testData={testData} testDataLabel={strings.status.mock}>
        {handles ? <NodeInputHandle variant={inputVariant} /> : null}
        <NodeIconTile
          category="action"
          size={layout.tile}
          selected={selected}
          testData={testData}
          {...resolveNodeIcons({ icon, selectedIcon }, categoryNodeIcons.action)}
        />
        <NodeText title={title} subtitle={subtitle} subtitleKind={subtitleKind} titleLines={layout.titleLines} {...nodeCount.textProps} />
        {handles ? <NodeOutputHandles handles={OUTPUTS} /> : null}
      </NodeCardBody>
    </NodeCard>
  );
});
