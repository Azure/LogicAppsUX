import type { HTMLAttributes, ReactNode } from 'react';
import type { NodeHandleAxis } from '../primitives/NodeHandle';
import type { NodeRunStatus } from '../types';
import type { ActionNodeCardStrings, NodeFrameCountLabel } from '../strings';

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
  /** Unit-aware count for a collapsed container card; `strings.frame` owns wording and plurals. */
  countLabel?: NodeFrameCountLabel;
}
export const resolveNodeIcons = (
  props: Pick<BaseNodeCardProps, 'icon' | 'selectedIcon'>,
  defaults: { icon: ReactNode; selectedIcon: ReactNode }
) =>
  props.icon
    ? { icon: props.icon, selectedIcon: props.selectedIcon ?? props.icon }
    : { icon: defaults.icon, selectedIcon: props.selectedIcon ?? defaults.selectedIcon };
