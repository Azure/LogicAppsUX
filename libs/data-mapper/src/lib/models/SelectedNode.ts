import type { FunctionGroupBranding } from '../constants/FunctionConstants';
import type { FunctionInput } from './Function';
import type { SchemaNodeDataType } from './Schema';

export enum NodeType {
  Source = 'source',
  Target = 'target',
  Function = 'function',
}

export type SelectedNode = SelectedSchemaNode | SelectedFunctionNode;
export type SelectedSchemaNode = SelectedSourceNode | SelectedTargetNode;

export interface SelectedSourceNode {
  nodeType: NodeType.Source;
  name: string;
  path: string;
  dataType: SchemaNodeDataType;
}

export interface SelectedTargetNode extends Omit<SelectedSourceNode, 'nodeType'> {
  nodeType: NodeType.Target;
  inputIds: string[];
  defaultValue: string;
  doNotGenerateIfNoValue: boolean;
  nullable: boolean;
}

export interface SelectedFunctionNode {
  nodeType: NodeType.Function;
  name: string;
  id: string;
  branding: FunctionGroupBranding;
  description: string;
  codeEx: string;
  inputs: FunctionInput[];
  outputId: string;
}
