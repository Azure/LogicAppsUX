import type { HTMLAttributes, ReactNode } from 'react';
import type { NodeHandleAxis } from '../primitives/NodeHandle';
import type { NodeRunStatus } from '../types';
import type { ActionNodeCardStrings } from '../strings';

export interface BaseNodeCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  selectedIcon?: ReactNode;
  selected?: boolean;
  status?: NodeRunStatus;
  statusDetail?: string;
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
