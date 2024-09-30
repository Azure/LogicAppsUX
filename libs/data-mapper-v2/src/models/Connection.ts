import type { FunctionData } from './Function';
import type { SchemaNodeExtended } from '@microsoft/logic-apps-shared';

export type ConnectionDictionary = { [key: string]: Connection }; // key = "{(target)||(source)}-{nodeId}"
export type InputConnections = InputConnection[]; // danielle fix this- confusing
export type InputConnection = ConnectionUnit | CustomInput | EmptyConnection | undefined; // undefined for unbounded input value arrays

export interface Connection {
  self: ConnectionUnit;
  inputs: InputConnections;
  outputs: ConnectionUnit[];
}

export interface ConnectionUnit {
  isDefined: true;
  isCustom: false;
  node: SchemaNodeExtended | FunctionData;
  reactFlowKey: string;
  isRepeating?: boolean;
}

export interface CustomInput {
  isDefined: true;
  isCustom: true;
  value: string;
}

export interface EmptyConnection {
  isDefined: false;
  isCustom: false;
}