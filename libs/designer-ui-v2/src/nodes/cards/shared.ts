import type { HTMLAttributes, ReactNode } from 'react';
import type { NodeHandleAxis } from '../primitives/NodeHandle';
import type { NodeCardDensity, NodeIconTone, NodeRunStatus, NodeStatusDisplay, NodeStatusTint, NodeStatusTone } from '../types';
import type { ActionNodeCardStrings, NodeFrameCountLabel } from '../strings';
import type { NodeCardProps } from '../primitives/NodeCard';

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
  /** Defaults to the edge badge; contained uses the subtitle line and an inset perimeter. */
  statusDisplay?: NodeStatusDisplay;
  /** Optional perimeter tone override when status semantics do not map 1:1 to the status union. */
  statusTone?: NodeStatusTone;
  /** Optional failure emphasis fill for status-bearing cards. */
  statusTint?: NodeStatusTint;
  /** Forwarded through `rest` to NodeCard; see NodeCardProps for semantics. */
  statusLabel?: string;
  statusAriaLabel?: string;
  /** Optional subtitle semantics marker (for example contained monitoring status text). */
  subtitleKind?: 'default' | 'status';
  inactive?: boolean;
  headerTint?: NodeCardProps['headerTint'];
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
