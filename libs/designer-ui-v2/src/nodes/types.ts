export type NodeCategory = 'trigger' | 'action' | 'control' | 'agent';
export type NodeRunStatus = 'pending' | 'running' | 'succeeded' | 'skipped' | 'failed' | 'error' | 'warning' | 'cancelled' | 'mock';
export type NodeStatusDisplay = 'badge' | 'contained';
export type NodeStatusTone = 'success' | 'danger' | 'warning' | 'running' | 'skipped' | 'neutral';
export type NodeStatusTint = 'none' | 'failed';
export type NodeCardWidth = 'compact' | 'standardCompact' | 'standard' | 'wide' | 'fill';
/** Opt-in dense card preset; 'default' keeps the canonical nodeMetrics geometry. */
export type NodeCardDensity = 'default' | 'compact';
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
