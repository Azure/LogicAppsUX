import type { NodeRunStatus } from './types';

export type NodeStatusStrings = Record<NodeRunStatus, string>;
export interface ActionNodeCardStrings {
  status: NodeStatusStrings;
  /** Formats unit-aware counts on collapsed container cards; optional so older dictionaries still compile. */
  frame?: NodeFrameStrings;
}
export interface AgentToolsStrings {
  heading: (count: number) => string;
  addTools: string;
  collapseTools: string;
  expandTools: string;
  add: string;
}
export interface NodeInfoCardStrings {
  configured: string;
  close: string;
  learnMore: string;
  opensInNewTab: string;
  /** Optional so complete dictionaries written before it existed still compile. */
  testData?: string;
  /** Explains the test-data badge; optional for older dictionaries. */
  testDataDescription?: string;
}
export interface NodeBranchStrings {
  true: string;
  false: string;
  /** Spoken suffix for the branch that ran; optional for older dictionaries. */
  taken?: (label: string) => string;
}
/** What a frame count measures; the host supplies meaning, the dictionary owns wording and plurals. */
export type NodeFrameCountUnit = 'actions' | 'cases' | 'tools' | 'hiddenItems';
export type NodeFrameCountStrings = Record<NodeFrameCountUnit, (count: number) => string>;
/** A unit-aware count the host measures; the frame dictionary owns wording and plurals. */
export interface NodeFrameCountLabel {
  count: number;
  unit: NodeFrameCountUnit;
}
export interface NodeFrameStrings {
  actionCount: (count: number) => string;
  /** Optional so dictionaries written before unit-aware counts still compile; missing units use the defaults. */
  counts?: Partial<NodeFrameCountStrings>;
}
/** Zero-based indices are an API detail; every string receives one-based display values. */
export interface NodeIterationPagerStrings {
  label: string;
  previous: string;
  next: string;
  previousFailed: string;
  nextFailed: string;
  input: (count: number) => string;
  position: (current: number, count: number) => string;
}
export type NodeRunAfterStatus = 'succeeded' | 'failed' | 'skipped' | 'timedOut';
export interface NodeRunAfterStrings {
  status: Record<NodeRunAfterStatus, string>;
  summary: (statusLabels: readonly string[]) => string;
  collapsed: (count: number) => string;
}
export interface LoopNodeCardStrings extends ActionNodeCardStrings {
  loop: { foreach: string };
}
export interface NodeMergePointStrings {
  label: (name: string) => string;
}
export interface PlaceholderTriggerStrings {
  title: string;
}
export interface CollapseChipStrings {
  nounSingular: string;
  nounPlural: string;
  show: (count: number, noun: string) => string;
  hide: (count: number, noun: string) => string;
}
export interface NodeStrings extends ActionNodeCardStrings {
  condition: { if: string; switch: string };
  branch: NodeBranchStrings;
  tool: { mcp: string; subWorkflow: string };
  agent: { model: string; tools: string; addTool: string };
  tools: AgentToolsStrings;
  info: NodeInfoCardStrings;
  addAction: string;
  loop: LoopNodeCardStrings['loop'];
  merge: NodeMergePointStrings;
  placeholder: PlaceholderTriggerStrings;
  collapse: CollapseChipStrings;
  /** Later additions are optional; consumers resolve them with the exported defaults. */
  frame?: NodeFrameStrings;
  pager?: NodeIterationPagerStrings;
  runAfter?: NodeRunAfterStrings;
}

export const defaultNodeFrameCountStrings: NodeFrameCountStrings = {
  actions: (count) => (count === 1 ? '1 action' : `${count} actions`),
  cases: (count) => (count === 1 ? '1 case' : `${count} cases`),
  tools: (count) => (count === 1 ? '1 tool' : `${count} tools`),
  hiddenItems: (count) => (count === 1 ? '1 hidden item' : `${count} hidden items`),
};
export const defaultNodeFrameStrings: NodeFrameStrings = {
  actionCount: defaultNodeFrameCountStrings.actions,
  counts: defaultNodeFrameCountStrings,
};
export const defaultNodeIterationPagerStrings: NodeIterationPagerStrings = {
  label: 'Iterations',
  previous: 'Previous iteration',
  next: 'Next iteration',
  previousFailed: 'Previous failed iteration',
  nextFailed: 'Next failed iteration',
  input: (count) => `Iteration number, 1 to ${count}`,
  position: (current, count) => `${current} of ${count}`,
};
export const defaultNodeRunAfterStrings: NodeRunAfterStrings = {
  status: { succeeded: 'Is successful', failed: 'Has failed', skipped: 'Is skipped', timedOut: 'Timed out' },
  summary: (statusLabels) => `Runs after: ${statusLabels.join(', ')}`,
  collapsed: (count) => `Runs after ${count} actions`,
};
export const defaultBranchTakenString = (label: string) => `${label}, branch taken`;

/** Callers supply complete dictionaries; `??` defaults never replace an intentional empty string. */
export const defaultNodeStrings: NodeStrings = {
  status: {
    pending: 'Pending',
    running: 'Running',
    succeeded: 'Succeeded',
    skipped: 'Skipped',
    failed: 'Failed',
    error: 'Error',
    warning: 'Warning',
    cancelled: 'Cancelled',
    mock: 'Using test data',
  },
  condition: { if: 'If', switch: 'Switch' },
  branch: { true: 'True', false: 'False', taken: defaultBranchTakenString },
  tool: { mcp: 'Type · MCP', subWorkflow: 'Sub-workflow' },
  agent: { model: 'Model', tools: 'Tools', addTool: 'Add tool' },
  tools: {
    heading: (count) => `Tools (${count})`,
    addTools: 'Add tools',
    collapseTools: 'Collapse tools',
    expandTools: 'Expand tools',
    add: 'Add',
  },
  info: {
    configured: 'Configured',
    close: 'Close',
    learnMore: 'Learn more',
    opensInNewTab: '(opens in a new tab)',
    testData: 'Using test data',
    testDataDescription: 'Test runs return saved output instead of making live calls.',
  },
  addAction: 'Add action',
  loop: { foreach: 'For each' },
  merge: { label: (name) => `Merge point for ${name}` },
  placeholder: { title: 'Add a trigger to start your workflow' },
  collapse: {
    nounSingular: 'item',
    nounPlural: 'items',
    show: (count, noun) => `Show ${count} ${noun}`,
    hide: (count, noun) => `Hide ${count} ${noun}`,
  },
  frame: defaultNodeFrameStrings,
  pager: defaultNodeIterationPagerStrings,
  runAfter: defaultNodeRunAfterStrings,
};
