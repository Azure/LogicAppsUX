import type { FunctionGroupBranding } from '../constants/FunctionConstants';
import type { FunctionInput } from './Function';
import type { SchemaNodeDataType } from './Schema';

export enum NodeType {
  Input = 'input',
  Output = 'output',
  Function = 'function',
}

export type SelectedNode = SelectedSchemaNode | SelectedFunctionNode;
export type SelectedSchemaNode = SelectedSourceNode | SelectedTargetNode;

export interface SelectedSourceNode {
  nodeType: NodeType.Input;
  name: string;
  path: string;
  dataType: SchemaNodeDataType;
}

export interface SelectedTargetNode extends Omit<SelectedSourceNode, 'nodeType'> {
  nodeType: NodeType.Output;
  inputIds: string[];
  defaultValue: string;
  doNotGenerateIfNoValue: boolean;
  nullable: boolean;
}

export interface SelectedFunctionNode {
  nodeType: NodeType.Function;
  name: string;
  branding: FunctionGroupBranding;
  description: string;
  codeEx: string;
  inputs: FunctionInput[];
  outputId: string;
}
