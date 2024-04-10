import { tokens } from '@fluentui/react-components';
import { SchemaType } from '@microsoft/logic-apps-shared';

// danielle strip this

export const checkerboardBackgroundImage = `repeating-linear-gradient(45deg, ${tokens.colorNeutralBackground1} 25%, transparent 25%, transparent 75%, ${tokens.colorNeutralBackground1} 75%, ${tokens.colorNeutralBackground1}), repeating-linear-gradient(45deg, ${tokens.colorNeutralBackground1} 25%, ${tokens.colorNeutralBackground2} 25%, ${tokens.colorNeutralBackground2} 75%, ${tokens.colorNeutralBackground1} 75%, ${tokens.colorNeutralBackground1})`;

export const defaultCanvasZoom = 1.25;
export const reactFlowFitViewOptions = { maxZoom: defaultCanvasZoom, includeHiddenNodes: true };

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
