import type { FunctionData } from './Function';
import type { SchemaNodeExtended } from './Schema';

export type ConnectionDictionary = { [key: string]: Connection }; // key= "{(target)||(source)}-{nodeId}"

export interface Connection {
  destination: ConnectionUnit;
  sources: ConnectionUnit[];
  isSelected?: boolean;
}

export interface ConnectionUnit {
  node: SchemaNodeExtended | FunctionData;
  reactFlowKey: string;
}
