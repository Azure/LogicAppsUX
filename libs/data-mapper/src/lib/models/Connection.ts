import type { FunctionData } from './Function';
import type { SchemaNodeExtended } from './Schema';

export type ConnectionDictionary = { [key: string]: Connection };

export interface Connection {
  destination: ConnectionUnit;
  sources: ConnectionUnit[];
  loop?: LoopConnection;
  condition?: string;
  isHovered?: boolean;
}

export interface ConnectionUnit {
  node: SchemaNodeExtended | FunctionData;
  reactFlowKey: string;
  isSelected?: boolean;
}

export interface LoopConnection {
  loopSource: string;
  loopIndex?: string;
}
