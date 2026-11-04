import { forwardRef } from 'react';
import { NodeCard } from '../primitives/NodeCard';
import { NodeCardBody } from '../primitives/NodeCardBody';
import { NodeOutputHandles } from '../primitives/NodeHandle';
import { NodeIconTile } from '../primitives/NodeIconTile';
import { NodeText } from '../primitives/NodeText';
import { defaultNodeStrings } from '../strings';
import { categoryNodeIcons } from './categoryIcons';
import { resolveNodeIcons } from './shared';
import type { BaseNodeCardProps } from './shared';
export interface TriggerNodeCardProps extends BaseNodeCardProps {
  handles?: boolean;
}
const OUTPUTS = ['neutral'] as const;
export const TriggerNodeCard = forwardRef<HTMLDivElement, TriggerNodeCardProps>(function TriggerNodeCard(
  { title, subtitle, icon, selectedIcon, selected, status, statusDetail, strings = defaultNodeStrings, handles = true, ...rest },
  ref
) {
  const testData = status === 'mock';
  return (
    <NodeCard
      {...rest}
      ref={ref}
      shape="pill"
      width="standard"
      selected={selected}
      status={status}
      statusDetail={statusDetail}
      strings={strings}
      data-node-card="trigger"
    >
      <NodeCardBody testData={testData} testDataLabel={strings.status.mock}>
        <NodeIconTile
          category="trigger"
          selected={selected}
          testData={testData}
          {...resolveNodeIcons({ icon, selectedIcon }, categoryNodeIcons.trigger)}
        />
        <NodeText title={title} subtitle={subtitle} />
        {handles ? <NodeOutputHandles handles={OUTPUTS} /> : null}
      </NodeCardBody>
    </NodeCard>
  );
});
