import type { FunctionData } from './Function';
import type { SchemaNodeExtended } from '@microsoft/utils-logic-apps';

export type ConnectionDictionary = { [key: string]: Connection }; // key = "{(target)||(source)}-{nodeId}"
export type InputConnectionDictionary = { [inputNumber: string]: InputConnection[] };
export type InputConnection = ConnectionUnit | string | undefined; // undefined for unbounded input value arrays

export interface Connection {
  self: ConnectionUnit;
  inputs: InputConnectionDictionary;
  outputs: ConnectionUnit[];
}

export interface ConnectionUnit {
  node: SchemaNodeExtended | FunctionData;
  reactFlowKey: string;
}
