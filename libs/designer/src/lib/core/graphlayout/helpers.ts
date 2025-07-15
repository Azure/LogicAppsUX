import { WORKFLOW_EDGE_TYPES } from '@microsoft/logic-apps-shared';
import type { WorkflowNode } from '../parsers/models/workflowNode';

export const footerMarker = '#footer';

export interface LayoutRelevantData {
  id: string;
  height: number | undefined;
  width: number | undefined;
  type: string | undefined;
  edges: LayoutRelevantEdgeData[] | undefined;
  children: Array<LayoutRelevantData | undefined> | undefined;
  hasFooter: boolean;
  hasOnlyEdge: boolean | undefined;
}

interface LayoutRelevantEdgeData {
  id: string;
  source: string;
  target: string;
  type: string | undefined;
}

// Helper function to extract only data relevant to elk layout from a WorkflowNode
// This is used to avoid unnecessary re-layouts when non-layout-relevant properties change
export const getLayoutRelevantData = (node: WorkflowNode | undefined): LayoutRelevantData | undefined => {
  if (!node) {
    return undefined;
  }
  return {
    id: node.id,
    height: node.height,
    width: node.width,
    type: node.type,
    // Include properties that affect layoutOptions in convertWorkflowGraphToElkGraph
    edges: node.edges?.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
    })),
    children: node.children?.map((child) => getLayoutRelevantData(child as WorkflowNode)),
    hasFooter: node.children?.findIndex((child) => child.id.endsWith(footerMarker)) !== -1,
    hasOnlyEdge: node.edges?.some((edge) => edge.type === WORKFLOW_EDGE_TYPES.ONLY_EDGE),
  };
};
