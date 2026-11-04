import { forwardRef, useMemo } from 'react';
import type { ReactNode } from 'react';
import { ArrowTurnRightFilled, ArrowTurnRightRegular } from '@fluentui/react-icons';
import { NodeCard } from '../primitives/NodeCard';
import { NodeCardBody } from '../primitives/NodeCardBody';
import { NodeInputHandle, NodeOutputHandles } from '../primitives/NodeHandle';
import { NodeIconTile } from '../primitives/NodeIconTile';
import { NodeText } from '../primitives/NodeText';
import type { ConditionNodeKind, NodeHandleVariant } from '../types';
import type { ActionNodeCardStrings, NodeStrings } from '../strings';
import { defaultNodeStrings } from '../strings';
import { categoryNodeIcons } from './categoryIcons';
import { resolveNodeIcons } from './shared';
import type { BaseNodeCardProps } from './shared';
const IF_OUTPUTS = ['success', 'danger'] as const;
const ICONS = {
  if: categoryNodeIcons.control,
  switch: { icon: <ArrowTurnRightRegular />, selectedIcon: <ArrowTurnRightFilled /> },
};
export interface ConditionNodeCardProps extends Omit<BaseNodeCardProps, 'strings'> {
  kind: ConditionNodeKind;
  handles?: boolean;
  caseCount?: number;
  inputSlot?: ReactNode;
  outputSlots?: readonly ReactNode[];
  takenOutput?: number;
  strings?: ActionNodeCardStrings & { condition: NodeStrings['condition'] };
}
export const ConditionNodeCard = forwardRef<HTMLDivElement, ConditionNodeCardProps>(function ConditionNodeCard(
  {
    kind,
    title,
    subtitle,
    icon,
    selectedIcon,
    selected,
    status,
    statusDetail,
    strings = defaultNodeStrings,
    caseCount = 4,
    inputSlot,
    outputSlots,
    takenOutput,
    handleAxis,
    handles = true,
    ...rest
  },
  ref
) {
  const outputs: readonly NodeHandleVariant[] = useMemo(
    () => Array.from({ length: Number.isFinite(caseCount) ? Math.max(1, Math.floor(caseCount)) : 1 }, () => 'neutral' as const),
    [caseCount]
  );
  const testData = status === 'mock';
  return (
    <NodeCard
      {...rest}
      ref={ref}
      width="compact"
      size={kind === 'switch' && handleAxis !== 'vertical' ? 'switch' : 'medium'}
      handleAxis={handleAxis}
      selected={selected}
      status={status}
      statusDetail={statusDetail}
      strings={strings}
      data-node-card={kind}
    >
      <NodeCardBody testData={testData} testDataLabel={strings.status.mock}>
        {handles ? <NodeInputHandle>{inputSlot}</NodeInputHandle> : null}
        <NodeIconTile
          category="control"
          selected={selected}
          testData={testData}
          {...resolveNodeIcons({ icon, selectedIcon }, ICONS[kind])}
        />
        <NodeText title={title} subtitle={subtitle ?? strings.condition[kind]} />
        {handles ? (
          <NodeOutputHandles
            handles={kind === 'if' ? IF_OUTPUTS : outputs}
            spacing={kind === 'switch' ? 'tight' : 'loose'}
            slots={outputSlots}
            activeIndex={takenOutput}
          />
        ) : null}
      </NodeCardBody>
    </NodeCard>
  );
});
