import type { Edge, EdgeTypes, Node, NodeTypes } from '@xyflow/react';

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

/** Pre-positioned native graph and trusted, presentation-only renderers. No editor callbacks are accepted. */
export interface WorkflowPreviewGraph {
  nodes: Node[];
  edges: Edge[];
  nodeTypes: NodeTypes;
  edgeTypes: EdgeTypes;
  /** Read-only geometry feedback from the private viewport, never editor changes. */
  onNodeSizesChange?: (sizes: Record<string, { width: number; height: number }>) => void;
}

export type WorkflowPreviewProps = {
  ariaLabel?: string;
  className?: string;
} & (
  | {
      nodes: WorkflowPreviewNode[];
      edges: WorkflowPreviewEdge[];
      graph?: never;
    }
  | {
      graph: WorkflowPreviewGraph;
      nodes?: never;
      edges?: never;
    }
);
