import type { NodeRunStatus } from './types';

export type NodeStatusStrings = Record<NodeRunStatus, string>;
export interface ActionNodeCardStrings {
  status: NodeStatusStrings;
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
  branch: { true: string; false: string };
  tool: { mcp: string; subWorkflow: string };
  agent: { model: string; tools: string; addTool: string };
  tools: AgentToolsStrings;
  info: NodeInfoCardStrings;
  addAction: string;
  loop: LoopNodeCardStrings['loop'];
  merge: NodeMergePointStrings;
  placeholder: PlaceholderTriggerStrings;
  collapse: CollapseChipStrings;
}

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
  branch: { true: 'True', false: 'False' },
  tool: { mcp: 'Type · MCP', subWorkflow: 'Sub-workflow' },
  agent: { model: 'Model', tools: 'Tools', addTool: 'Add tool' },
  tools: {
    heading: (count) => `Tools (${count})`,
    addTools: 'Add tools',
    collapseTools: 'Collapse tools',
    expandTools: 'Expand tools',
    add: 'Add',
  },
  info: { configured: 'Configured', close: 'Close', learnMore: 'Learn more', opensInNewTab: '(opens in a new tab)' },
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
};
