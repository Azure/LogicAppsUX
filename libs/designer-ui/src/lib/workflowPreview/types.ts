// Single-line card dimensions; longer titles expand the measured height naturally.
export const WORKFLOW_PREVIEW_NODE_WIDTH = 200;
export const WORKFLOW_PREVIEW_NODE_HEIGHT = 44;

export interface WorkflowPreviewNode {
  id: string;
  label: string;
  position: { x: number; y: number };
  iconUri?: string;
  brandColor?: string;
  /** Hierarchical positions are parent-relative; containers must precede their children. */
  parentId?: string;
  width?: number;
  /** Omit for natural card height. Laid-out containers require explicit width and height. */
  height?: number;
  kind?: 'container' | 'scope' | 'branch';
  branchType?: 'true' | 'false' | 'case' | 'default' | 'tool' | 'do';
}

export interface WorkflowPreviewEdge {
  id: string;
  source: string;
  target: string;
}

export interface WorkflowPreviewProps {
  nodes: WorkflowPreviewNode[];
  edges: WorkflowPreviewEdge[];
  ariaLabel?: string;
  className?: string;
}
