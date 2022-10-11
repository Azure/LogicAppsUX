import type { FunctionData } from './Function';
import type { SchemaNodeExtended } from './Schema';

export type ConnectionDictionary = { [key: string]: Connection }; // key= "{(target)||(source)}-{nodeId}"

export interface Connection {
  destination: ConnectionUnit;
  inputs: ConnectionInput[];
  isSelected?: boolean;
}

export type ConnectionInput = ConnectionUnit | string | undefined;

export interface ConnectionUnit {
  node: SchemaNodeExtended | FunctionData;
  reactFlowKey: string;
}
