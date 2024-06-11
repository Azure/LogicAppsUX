import { SchemaType } from '@microsoft/logic-apps-shared';

export const ReactFlowNodeType = {
  SchemaNode: 'schemaNode',
  FunctionNode: 'functionNode',
  FunctionPlaceholder: 'functionPlaceholder',
} as const;
export type ReactFlowNodeType = (typeof ReactFlowNodeType)[keyof typeof ReactFlowNodeType];

export const ReactFlowEdgeType = {
  ConnectionEdge: 'connectionEdge',
} as const;
export type ReactFlowEdgeType = (typeof ReactFlowEdgeType)[keyof typeof ReactFlowEdgeType];

export const sourcePrefix = `${SchemaType.Source}-`;
export const targetPrefix = `${SchemaType.Target}-`;
export const functionPrefix = 'function-';
