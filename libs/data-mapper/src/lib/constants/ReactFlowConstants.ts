import { SchemaTypes } from '../models';
import { tokens } from '@fluentui/react-components';

export const checkerboardBackgroundImage = `repeating-linear-gradient(45deg, ${tokens.colorNeutralBackground1} 25%, transparent 25%, transparent 75%, ${tokens.colorNeutralBackground1} 75%, ${tokens.colorNeutralBackground1}), repeating-linear-gradient(45deg, ${tokens.colorNeutralBackground1} 25%, ${tokens.colorNeutralBackground2} 25%, ${tokens.colorNeutralBackground2} 75%, ${tokens.colorNeutralBackground1} 75%, ${tokens.colorNeutralBackground1})`;

export const defaultCanvasZoom = 1.25;

export enum ReactFlowNodeType {
  SchemaNode = 'schemaNode',
  FunctionNode = 'functionNode',
}

export enum ReactFlowEdgeType {
  ConnectionEdge = 'connectionEdge',
}

export const sourcePrefix = `${SchemaTypes.Source}-`;
export const targetPrefix = `${SchemaTypes.Target}-`;
export const functionPrefix = 'function-';
