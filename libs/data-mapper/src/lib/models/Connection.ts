import type { FunctionData } from './Function';
import type { SchemaNodeExtended } from './Schema';

export type ConnectionDictionary = { [key: string]: Connection };

export interface Connection {
  destination: SchemaNodeExtended | FunctionData;
  source: SchemaNodeExtended | FunctionData;
  loop?: LoopConnection;
  condition?: string;
  isSelected?: boolean;

  //Only used to display edges
  reactFlowSource: string;
  reactFlowDestination: string;
}

export interface LoopConnection {
  loopSource: string;
  loopIndex?: string;
}
