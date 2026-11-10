import { forwardRef } from 'react';
import { FlashFilled, FlashRegular, FlowFilled, FlowRegular, PlugConnectedRegular } from '@fluentui/react-icons';
import { makeStyles, mergeClasses } from '@fluentui/react-components';
import { NodeCard } from '../primitives/NodeCard';
import { NodeCardBody } from '../primitives/NodeCardBody';
import { NodeIconTile } from '../primitives/NodeIconTile';
import { NodeText } from '../primitives/NodeText';
import { nodeMetrics } from '../metrics';
import type { NodeToolItemSize, NodeToolKind } from '../types';
import type { ActionNodeCardStrings, NodeStrings } from '../strings';
import { defaultNodeStrings } from '../strings';
import { resolveNodeIcons } from './shared';
import type { BaseNodeCardProps } from './shared';
const ICONS = {
  action: { icon: <FlashRegular />, selectedIcon: <FlashFilled /> },
  // Host-provided MCP artwork goes in the normal icon slot; no Otto asset is redistributed.
  mcp: { icon: <PlugConnectedRegular />, selectedIcon: <PlugConnectedRegular /> },
  subWorkflow: { icon: <FlowRegular />, selectedIcon: <FlowFilled /> },
};
const useStyles = makeStyles({ badgeClearance: { marginTop: `${nodeMetrics.badge.overhang}px` } });
export interface ToolItemCardProps extends Omit<BaseNodeCardProps, 'strings'> {
  kind?: NodeToolKind;
  size?: NodeToolItemSize;
  strings?: ActionNodeCardStrings & { tool: NodeStrings['tool'] };
}
export const ToolItemCard = forwardRef<HTMLDivElement, ToolItemCardProps>(function ToolItemCard(
  {
    kind = 'action',
    size = 'medium',
    title,
    subtitle,
    icon,
    selectedIcon,
    selected,
    status,
    statusDetail,
    strings = defaultNodeStrings,
    className,
    ...rest
  },
  ref
) {
  const styles = useStyles();
  const testData = status === 'mock';
  return (
    <NodeCard
      {...rest}
      ref={ref}
      width={size === 'small' ? 'fill' : 'standard'}
      size={size}
      selected={selected}
      status={status}
      statusDetail={statusDetail}
      strings={strings}
      className={mergeClasses(size === 'small' && status && !testData && styles.badgeClearance, className)}
      data-node-card="tool"
      data-tool-kind={kind}
    >
      <NodeCardBody density={size === 'small' ? 'small' : 'default'} testData={testData} testDataLabel={strings.status.mock}>
        <NodeIconTile
          category="action"
          size={size}
          selected={selected}
          testData={testData}
          {...resolveNodeIcons({ icon, selectedIcon }, ICONS[kind])}
        />
        <NodeText title={title} subtitle={subtitle ?? (kind === 'action' ? undefined : strings.tool[kind])} />
      </NodeCardBody>
    </NodeCard>
  );
});
