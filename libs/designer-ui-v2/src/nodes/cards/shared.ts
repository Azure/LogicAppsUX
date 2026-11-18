import type { HTMLAttributes, ReactNode } from 'react';
import type { NodeHandleAxis } from '../primitives/NodeHandle';
import type { NodeCardDensity, NodeRunStatus } from '../types';
import type { ActionNodeCardStrings } from '../strings';

export interface BaseNodeCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  selectedIcon?: ReactNode;
  selected?: boolean;
  status?: NodeRunStatus;
  statusDetail?: string;
  /** Forwarded through `rest` to NodeCard; see NodeCardProps for semantics. */
  statusLabel?: string;
  statusAriaLabel?: string;
  inactive?: boolean;
  strings?: ActionNodeCardStrings;
  handleAxis?: NodeHandleAxis;
  after?: ReactNode;
}
export const resolveNodeIcons = (
  props: Pick<BaseNodeCardProps, 'icon' | 'selectedIcon'>,
  defaults: { icon: ReactNode; selectedIcon: ReactNode }
) =>
  props.icon
    ? { icon: props.icon, selectedIcon: props.selectedIcon ?? props.icon }
    : { icon: defaults.icon, selectedIcon: props.selectedIcon ?? defaults.selectedIcon };

/** Opt-in Standard compact preset for single-row cards (action, trigger). */
export interface CompactNodeCardProps {
  /** 'compact' renders the 208x52 preset; defaults keep canonical nodeMetrics geometry. */
  density?: NodeCardDensity;
  /** Compact only: hosts pass the same line count they used to size layout (see getCompactTitleLines). */
  titleLines?: 1 | 2;
}
export const resolveCardDensity = ({ density = 'default', titleLines = 1 }: CompactNodeCardProps) =>
  density === 'compact'
    ? ({
        width: 'standardCompact',
        size: titleLines === 2 ? 'compactWrapped' : 'compact',
        body: 'compact',
        tile: 'small',
        titleLines,
      } as const)
    : ({ width: 'standard', size: 'medium', body: 'default', tile: 'medium', titleLines: 1 } as const);
