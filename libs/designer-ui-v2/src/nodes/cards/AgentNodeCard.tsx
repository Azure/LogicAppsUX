import { Children, forwardRef } from 'react';
import type { ReactNode } from 'react';
import { CubeRegular } from '@fluentui/react-icons';
import { NodeCard } from '../primitives/NodeCard';
import { NodeCardBody, NodeCardFooter } from '../primitives/NodeCardBody';
import { NodeInputHandle, NodeOutputHandles } from '../primitives/NodeHandle';
import { NodeIconTile } from '../primitives/NodeIconTile';
import { NodeText } from '../primitives/NodeText';
import { NodeToolConnector } from '../primitives/NodeToolConnector';
import type { ActionNodeCardStrings, NodeStrings } from '../strings';
import { defaultNodeStrings } from '../strings';
import { AgentToolsPanel } from './AgentToolsPanel';
import { categoryNodeIcons } from './categoryIcons';
import { resolveNodeIcons } from './shared';
import type { BaseNodeCardProps } from './shared';
const OUTPUTS = ['neutral'] as const;
export interface AgentNodeCardProps extends Omit<BaseNodeCardProps, 'strings'> {
  handles?: boolean;
  model?: string;
  tools?: ReactNode;
  /** Replaces the built-in tools panel; the host retains ownership of external tool nodes. */
  toolsPanelSlot?: ReactNode;
  toolsExpanded?: boolean;
  onToggleTools?: () => void;
  onAddTool?: () => void;
  inputSlot?: ReactNode;
  outputSlot?: ReactNode;
  footerAction?: ReactNode;
  strings?: ActionNodeCardStrings & Pick<NodeStrings, 'agent' | 'tools'>;
}
export const AgentNodeCard = forwardRef<HTMLDivElement, AgentNodeCardProps>(function AgentNodeCard(
  {
    title,
    subtitle,
    icon,
    selectedIcon,
    selected,
    status,
    statusDetail,
    strings = defaultNodeStrings,
    model,
    tools,
    toolsPanelSlot,
    toolsExpanded,
    onToggleTools,
    onAddTool,
    inputSlot,
    outputSlot,
    footerAction,
    handleAxis,
    after,
    handles = true,
    ...rest
  },
  ref
) {
  const hasToolsPanel = Children.toArray(toolsPanelSlot).length > 0;
  const hasTools = hasToolsPanel || Children.toArray(tools).length > 0;
  const outputs = handles ? <NodeOutputHandles handles={OUTPUTS} slots={outputSlot != null ? [outputSlot] : undefined} /> : null;
  const vertical = handleAxis === 'vertical';
  const testData = status === 'mock';
  return (
    <NodeCard
      {...rest}
      ref={ref}
      width="wide"
      surface="agent"
      selected={selected}
      status={status}
      statusDetail={statusDetail}
      strings={strings}
      data-node-card="agent"
      handleAxis={handleAxis}
      after={
        <>
          {handles ? (
            <NodeToolConnector hasTools={hasTools} onAddTool={onAddTool} label={strings.agent.tools} addToolLabel={strings.agent.addTool} />
          ) : null}
          {hasToolsPanel ? (
            toolsPanelSlot
          ) : hasTools ? (
            <AgentToolsPanel expanded={toolsExpanded} onToggleExpanded={onToggleTools} onAddTool={onAddTool} strings={strings.tools}>
              {tools}
            </AgentToolsPanel>
          ) : null}
          {vertical ? outputs : null}
          {after}
        </>
      }
    >
      <NodeCardBody testData={testData} testDataLabel={strings.status.mock}>
        {handles ? <NodeInputHandle>{inputSlot}</NodeInputHandle> : null}
        <NodeIconTile
          category="agent"
          selected={selected}
          testData={testData}
          {...resolveNodeIcons({ icon, selectedIcon }, categoryNodeIcons.agent)}
        />
        <NodeText title={title} subtitle={subtitle} />
        {vertical ? null : outputs}
      </NodeCardBody>
      <NodeCardFooter icon={<CubeRegular />} action={footerAction}>
        {model ?? strings.agent.model}
      </NodeCardFooter>
    </NodeCard>
  );
});
