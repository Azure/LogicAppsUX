import { forwardRef } from 'react';
import { NodeCard } from '../primitives/NodeCard';
import { NodeCardBody } from '../primitives/NodeCardBody';
import { NodeInputHandle, NodeOutputHandles } from '../primitives/NodeHandle';
import { NodeIconTile } from '../primitives/NodeIconTile';
import { NodeText } from '../primitives/NodeText';
import { defaultNodeStrings } from '../strings';
import type { NodeHandleVariant } from '../types';
import { categoryNodeIcons } from './categoryIcons';
import { resolveNodeIcons } from './shared';
import { useNodeCount } from '../countLabel';
import type { BaseNodeCardProps } from './shared';

export interface ActionNodeCardProps extends BaseNodeCardProps {
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
    countLabel,
    icon,
    selectedIcon,
    selected,
    status,
    statusDetail,
    strings = defaultNodeStrings,
    handles = true,
    inputVariant,
    ...rest
  },
  ref
) {
  const testData = status === 'mock';
  const nodeCount = useNodeCount(countLabel, strings, rest['aria-describedby']);
  return (
    <NodeCard
      {...rest}
      aria-describedby={nodeCount.describedBy}
      ref={ref}
      width="standard"
      selected={selected}
      status={status}
      statusDetail={statusDetail}
      strings={strings}
      data-node-card="action"
    >
      <NodeCardBody testData={testData} testDataLabel={strings.status.mock}>
        {handles ? <NodeInputHandle variant={inputVariant} /> : null}
        <NodeIconTile
          category="action"
          selected={selected}
          testData={testData}
          {...resolveNodeIcons({ icon, selectedIcon }, categoryNodeIcons.action)}
        />
        <NodeText title={title} subtitle={subtitle} {...nodeCount.textProps} />
        {handles ? <NodeOutputHandles handles={OUTPUTS} /> : null}
      </NodeCardBody>
    </NodeCard>
  );
});
