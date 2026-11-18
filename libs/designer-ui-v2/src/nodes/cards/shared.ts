import type { HTMLAttributes, ReactNode } from 'react';
import type { NodeHandleAxis } from '../primitives/NodeHandle';
import type { NodeIconTone, NodeRunStatus } from '../types';
import type { ActionNodeCardStrings } from '../strings';

export interface BaseNodeCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  selectedIcon?: ReactNode;
  /** Opt-in family color for a host fallback glyph; omitted keeps the category color. */
  iconTone?: NodeIconTone;
  /** Renders `icon` as untinted host artwork such as a connector logo. */
  iconArtwork?: boolean;
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
