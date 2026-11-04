import { forwardRef } from 'react';
import { NodeCard } from '../primitives/NodeCard';
import { NodeCardBody } from '../primitives/NodeCardBody';
import { NodeInputHandle, NodeOutputHandles } from '../primitives/NodeHandle';
import { NodeIconTile } from '../primitives/NodeIconTile';
import { NodeText } from '../primitives/NodeText';
import { defaultNodeStrings } from '../strings';
import { categoryNodeIcons } from './categoryIcons';
import { resolveNodeIcons } from './shared';
import type { BaseNodeCardProps } from './shared';

export interface ActionNodeCardProps extends BaseNodeCardProps {
  /** Visual dots only; disable when the host draws its own real handle affordances. */
  handles?: boolean;
}
const OUTPUTS = ['neutral'] as const;
export const ActionNodeCard = forwardRef<HTMLDivElement, ActionNodeCardProps>(function ActionNodeCard(
  { title, subtitle, icon, selectedIcon, selected, status, statusDetail, strings = defaultNodeStrings, handles = true, ...rest },
  ref
) {
  const testData = status === 'mock';
  return (
    <NodeCard
      {...rest}
      ref={ref}
      width="standard"
      selected={selected}
      status={status}
      statusDetail={statusDetail}
      strings={strings}
      data-node-card="action"
    >
      <NodeCardBody testData={testData} testDataLabel={strings.status.mock}>
        {handles ? <NodeInputHandle /> : null}
        <NodeIconTile
          category="action"
          selected={selected}
          testData={testData}
          {...resolveNodeIcons({ icon, selectedIcon }, categoryNodeIcons.action)}
        />
        <NodeText title={title} subtitle={subtitle} />
        {handles ? <NodeOutputHandles handles={OUTPUTS} /> : null}
      </NodeCardBody>
    </NodeCard>
  );
});
