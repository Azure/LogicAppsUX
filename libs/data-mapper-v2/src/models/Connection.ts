import type { FunctionData } from './Function';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';

export type ConnectionDictionary = { [key: string]: Connection }; // key = "{(target)||(source)}-{nodeId}"
export type InputConnection = NodeConnection | CustomValueConnection | EmptyConnection;

export interface Connection {
  self: NodeConnection;
  inputs: InputConnection[];
  outputs: NodeConnection[];
}

export interface NodeConnection {
  isDefined: true;
  isCustom: false;
  node: SchemaNodeExtended | FunctionData;
  reactFlowKey: string;
  isRepeating?: boolean;
  customId?: string;
}

export interface CustomValueConnection {
  isDefined: true;
  isCustom: true;
  value: string;
  customId?: string;
}

export interface EmptyConnection {
  isDefined: false;
  isCustom: false;
  customId?: string;
}
