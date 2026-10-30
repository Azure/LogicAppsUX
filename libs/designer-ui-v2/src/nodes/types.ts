export type NodeCategory = 'trigger' | 'action' | 'control' | 'agent';
export type NodeRunStatus = 'pending' | 'running' | 'succeeded' | 'skipped' | 'failed' | 'error' | 'warning' | 'cancelled' | 'mock';
export type NodeCardWidth = 'compact' | 'standard' | 'wide' | 'fill';
export type NodeCardShape = 'rounded' | 'pill';
export type NodeHandleVariant = 'neutral' | 'success' | 'danger';
export type NodeLabeledHandleBranch = 'true' | 'false';
export type NodeToolItemSize = 'medium' | 'small';
export type NodeToolKind = 'action' | 'mcp' | 'subWorkflow';
export type NodeLineVariant = 'solid' | 'solidSuccess' | 'solidDanger' | 'dashedNeutral' | 'dashedSuccess' | 'dashedDanger';
export type ConditionNodeKind = 'if' | 'switch';

/** Visual groups only. Hosts normalize their own operation vocabulary before selecting a glyph. */
export type NodeVisualKind =
  | 'http'
  | 'response'
  | 'schedule'
  | 'delay'
  | 'compose'
  | 'parseJson'
  | 'variables'
  | 'table'
  | 'filterArray'
  | 'join'
  | 'dateTime'
  | 'inlineCode'
  | 'terminate'
  | 'invokeWorkflow';
