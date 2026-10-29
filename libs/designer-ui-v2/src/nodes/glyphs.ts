import {
  ArrowReplyFilled,
  ArrowReplyRegular,
  BracesFilled,
  BracesRegular,
  BracesVariableFilled,
  BracesVariableRegular,
  CalendarClockFilled,
  CalendarClockRegular,
  ClockFilled,
  ClockRegular,
  CodeFilled,
  CodeRegular,
  DocumentDataFilled,
  DocumentDataRegular,
  FilterFilled,
  FilterRegular,
  FlowFilled,
  FlowRegular,
  GlobeFilled,
  GlobeRegular,
  MergeFilled,
  MergeRegular,
  ProhibitedFilled,
  ProhibitedRegular,
  TableFilled,
  TableRegular,
  TimerFilled,
  TimerRegular,
} from '@fluentui/react-icons';
import type { FluentIcon } from '@fluentui/react-icons';
import type { NodeVisualKind } from './types';

export interface NodeGlyph {
  readonly regular: FluentIcon;
  readonly filled: FluentIcon;
}

/** Canonical visual pairs; no host raw types, service membership, loading state or branding. */
export const NODE_GLYPHS = {
  http: { regular: GlobeRegular, filled: GlobeFilled },
  response: { regular: ArrowReplyRegular, filled: ArrowReplyFilled },
  schedule: { regular: ClockRegular, filled: ClockFilled },
  delay: { regular: TimerRegular, filled: TimerFilled },
  compose: { regular: BracesRegular, filled: BracesFilled },
  parseJson: { regular: DocumentDataRegular, filled: DocumentDataFilled },
  variables: { regular: BracesVariableRegular, filled: BracesVariableFilled },
  table: { regular: TableRegular, filled: TableFilled },
  filterArray: { regular: FilterRegular, filled: FilterFilled },
  join: { regular: MergeRegular, filled: MergeFilled },
  dateTime: { regular: CalendarClockRegular, filled: CalendarClockFilled },
  inlineCode: { regular: CodeRegular, filled: CodeFilled },
  terminate: { regular: ProhibitedRegular, filled: ProhibitedFilled },
  invokeWorkflow: { regular: FlowRegular, filled: FlowFilled },
} as const satisfies Record<NodeVisualKind, NodeGlyph>;

/**
 * Hosts resolve raw identity to NodeVisualKind | null | undefined: a known group,
 * an unknown built-in (suppress branding), or a connector (host loading/brand slots).
 * Call only for a known group and render the pair through existing icon/selectedIcon slots.
 * MCP remains host-supplied Regular/Regular, outside this finite table.
 */
export const getNodeGlyph = (kind: NodeVisualKind): NodeGlyph => NODE_GLYPHS[kind];
