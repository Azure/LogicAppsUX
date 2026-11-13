import { SUBGRAPH_TYPES, WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { Position, type Node } from '@xyflow/react';
import { nodeMetrics } from '@microsoft/designer-ui-v2/metrics';
import type { NodePresentation } from '../utils/graph';

const getSubgraphCardHandleHeight = (subgraphType?: string, readOnly = false): number | undefined => {
  switch (subgraphType) {
    case SUBGRAPH_TYPES.SWITCH_CASE:
    case SUBGRAPH_TYPES.AGENT_CONDITION:
      return 44;
    case SUBGRAPH_TYPES.CONDITIONAL_TRUE:
    case SUBGRAPH_TYPES.CONDITIONAL_FALSE:
    case SUBGRAPH_TYPES.SWITCH_DEFAULT:
    case SUBGRAPH_TYPES.UNTIL_DO:
      return 32;
    case SUBGRAPH_TYPES.SWITCH_ADD_CASE:
    case SUBGRAPH_TYPES.AGENT_ADD_CONDITON:
      return readOnly ? undefined : 44;
    default:
      return undefined;
  }
};

/**
 * Initial bounds for the simple, CSS-positioned handles. Embedded family ports and
 * container handles still use DOM measurement because their offsets depend on children.
 */
export const getPrecomputedHandles = (
  node: Node,
  width: number | undefined,
  height: number | undefined,
  readOnly = false,
  subgraphType?: string
): Node['handles'] => {
  if (!width || !height || !Number.isFinite(width) || !Number.isFinite(height) || width < 0 || height < 0) {
    return undefined;
  }
  const presentation = node.data.presentation as NodePresentation | undefined;
  if (
    ![
      WORKFLOW_NODE_TYPES.OPERATION_NODE,
      WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE,
      WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE,
      WORKFLOW_NODE_TYPES.PLACEHOLDER_NODE,
      WORKFLOW_NODE_TYPES.COLLAPSED_NODE,
    ].some((type) => type === node.type) ||
    node.data.branchPorts ||
    (presentation?.shared && presentation.family && !['scope', 'placeholder', 'collapsed'].includes(presentation.family)) ||
    subgraphType === SUBGRAPH_TYPES.MCP_CLIENT
  ) {
    return undefined;
  }
  const sourceHeight = node.type === WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE ? getSubgraphCardHandleHeight(subgraphType, readOnly) : height;
  if (sourceHeight === undefined) {
    return undefined;
  }
  const edgeDraw =
    node.type === WORKFLOW_NODE_TYPES.OPERATION_NODE || (node.type === WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE && node.id.endsWith('#footer'));
  const sharedSource = presentation?.shared && edgeDraw;
  const size = sharedSource ? nodeMetrics.handle.size : edgeDraw ? 10 : 6;
  const y = sharedSource
    ? sourceHeight - size - nodeMetrics.handle.edgeOffset
    : edgeDraw && !readOnly
      ? sourceHeight - size / 2
      : sourceHeight - size;

  return [
    { type: 'target', position: Position.Top, x: 0, y: 0, width, height },
    { type: 'source', position: Position.Bottom, x: (width - size) / 2, y, width: size, height: size },
  ];
};
