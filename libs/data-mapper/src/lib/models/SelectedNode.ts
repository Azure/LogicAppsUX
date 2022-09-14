import type { ExpressionInput } from './Expression';
import type { SchemaNodeDataType } from './Schema';

export enum NodeType {
  Input = 'input',
  Output = 'output',
  Expression = 'expression',
}

export type SelectedNode = SelectedSchemaNode | SelectedExpressionNode;
export type SelectedSchemaNode = SelectedInputNode | SelectedOutputNode;

export interface SelectedInputNode {
  nodeType: NodeType.Input;
  name: string;
  path: string;
  dataType: SchemaNodeDataType;
}

export interface SelectedOutputNode extends Omit<SelectedInputNode, 'nodeType'> {
  nodeType: NodeType.Output;
  inputIds?: string[];
  defaultValue: string;
  doNotGenerateIfNoValue: boolean;
  nullable: boolean;
}

// TODO: refine property specifics once fleshed out
export interface SelectedExpressionNode {
  nodeType: NodeType.Expression;
  name: string;
  iconName: string;
  description: string;
  codeEx: string;
  definition: string;
  inputs: ExpressionInput[];
  outputId: string;
}
