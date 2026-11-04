// Single-line card dimensions; longer titles expand the measured height naturally.
export const WORKFLOW_PREVIEW_NODE_WIDTH = 200;
export const WORKFLOW_PREVIEW_NODE_HEIGHT = 44;

export interface WorkflowPreviewNode {
  id: string;
  label: string;
  position: { x: number; y: number };
  iconUri?: string;
  brandColor?: string;
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
