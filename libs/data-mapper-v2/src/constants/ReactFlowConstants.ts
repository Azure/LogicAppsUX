import { SchemaType } from '@microsoft/logic-apps-shared';

export const ReactFlowNodeType = {
  FunctionNode: 'functionNode',
  FunctionPlaceholder: 'functionPlaceholder',
  CanvasNode: 'canvasNode',
  SchemaPanel: 'schemaPanel',
} as const;
export type ReactFlowNodeType = (typeof ReactFlowNodeType)[keyof typeof ReactFlowNodeType];

export const ReactFlowEdgeType = {
  ConnectionEdge: 'connectionEdge',
} as const;
export type ReactFlowEdgeType = (typeof ReactFlowEdgeType)[keyof typeof ReactFlowEdgeType];

export const sourcePrefix = `${SchemaType.Source}-`;
export const targetPrefix = `${SchemaType.Target}-`;
export const functionPrefix = 'function-';
export const NodeIds = {
  source: `${sourcePrefix}scehma_panel_node`,
  target: `${targetPrefix}scehma_panel_node`,
};
