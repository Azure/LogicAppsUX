import type { XYPosition } from 'reactflow';

export interface FunctionLocationMetadata {
  targetKey: string;
  position: XYPosition;
}

export interface FunctionMetadata {
  reactFlowGuid: string;
  functionKey: string;
  locations: FunctionLocationMetadata[];
  connections: string[];
}

export interface MapMetadata {
  functionNodes: FunctionMetadata[];
}
