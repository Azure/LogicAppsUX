import { Children, forwardRef } from 'react';
import type { ReactNode } from 'react';
import { makeStyles } from '@fluentui/react-components';
import { CubeRegular } from '@fluentui/react-icons';
import { nodeMetrics } from '../metrics';
import { NodeCard } from '../primitives/NodeCard';
import { NodeCardBody, NodeCardFooter } from '../primitives/NodeCardBody';
import { NodeInputHandle, NodeOutputHandles } from '../primitives/NodeHandle';
import { NodeIconTile } from '../primitives/NodeIconTile';
import { NodeText } from '../primitives/NodeText';
import { NodeToolConnector } from '../primitives/NodeToolConnector';
import type { ActionNodeCardStrings, NodeStrings } from '../strings';
import { defaultNodeStrings } from '../strings';
import type { NodeHandleVariant } from '../types';
import { AgentToolsPanel } from './AgentToolsPanel';
import { categoryNodeIcons } from './categoryIcons';
import { NODE_HOVER_CARD_IGNORE_ATTRIBUTE } from './NodeHoverCard';
import { resolveNodeIcons } from './shared';
import type { BaseNodeCardProps } from './shared';

const OUTPUTS = ['neutral'] as const;
// The tools are not the agent: hovering them must not open the Agent hover card. Presence-only marker.
const hoverCardIgnore = { [NODE_HOVER_CARD_IGNORE_ATTRIBUTE]: '' } as const;

const useStyles = makeStyles({
  // Default below-mode wrapper stays out of layout so connector and panel remain direct flex children of the card root.
  stacked: { display: 'contents' },
  // Side-mode positions the horizontal connector and tools panel to the right of a vertical Agent card.
  side: {
    position: 'absolute',
    top: 0,
    left: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    zIndex: 1,
  },
  sidePanel: { marginTop: `${nodeMetrics.toolsPanel.sideOffset}px` },
});

export type AgentToolsPlacement = 'below' | 'side';

export interface AgentNodeCardProps extends Omit<BaseNodeCardProps, 'strings'> {
  handles?: boolean;
  model?: string;
  tools?: ReactNode;
  /** Replaces the built-in tools panel; the host retains ownership of external tool nodes. */
  toolsPanelSlot?: ReactNode;
  toolsExpanded?: boolean;
  onToggleTools?: () => void;
  onAddTool?: (anchor?: HTMLElement | null) => void;
  /** Places tools below the card (default, used by Standard/horizontal) or to the right on vertical cards. */
  toolsPlacement?: AgentToolsPlacement;
  inputVariant?: NodeHandleVariant;
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
    toolsPlacement = 'below',
    inputVariant,
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
  const styles = useStyles();
  const hasToolsPanel = Children.toArray(toolsPanelSlot).length > 0;
  const hasTools = hasToolsPanel || Children.toArray(tools).length > 0;
  const canAdd = typeof onAddTool === 'function';
  const outputs = handles ? <NodeOutputHandles handles={OUTPUTS} slots={outputSlot != null ? [outputSlot] : undefined} /> : null;
  const vertical = handleAxis === 'vertical';
  // Side placement only applies to vertical cards; horizontal cards keep tools stacked below so the right-hand main output stays clear.
  const isSide = vertical && toolsPlacement === 'side';
  const testData = status === 'mock';
  // Omit the tool connector for empty read-only Agents so no dangling handle dot renders when tools cannot be added.
  const connector =
    handles && (hasTools || canAdd) ? (
      <NodeToolConnector
        hasTools={hasTools}
        onAddTool={onAddTool}
        label={strings.agent.tools}
        addToolLabel={strings.agent.addTool}
        orientation={isSide ? 'horizontal' : 'vertical'}
      />
    ) : null;
  const panel = hasToolsPanel ? (
    isSide ? (
      <div className={styles.sidePanel}>{toolsPanelSlot}</div>
    ) : (
      toolsPanelSlot
    )
  ) : hasTools ? (
    <AgentToolsPanel
      className={isSide ? styles.sidePanel : undefined}
      expanded={toolsExpanded}
      onToggleExpanded={onToggleTools}
      onAddTool={onAddTool}
      strings={strings.tools}
    >
      {tools}
    </AgentToolsPanel>
  ) : null;
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
      // Only side placement is marked so the default (below) card keeps its pre-existing DOM contract.
      data-tools-placement={isSide ? 'side' : undefined}
      handleAxis={handleAxis}
      after={
        <>
          {connector || panel ? (
            <div
              className={isSide ? styles.side : styles.stacked}
              data-testid={isSide ? 'agent-tools-side' : undefined}
              {...hoverCardIgnore}
            >
              {connector}
              {panel}
            </div>
          ) : null}
          {vertical ? outputs : null}
          {after}
        </>
      }
    >
      <NodeCardBody testData={testData} testDataLabel={strings.status.mock}>
        {handles ? <NodeInputHandle variant={inputVariant}>{inputSlot}</NodeInputHandle> : null}
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
