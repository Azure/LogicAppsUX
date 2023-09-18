import type { XYPosition } from 'reactflow';

export interface FunctionPositionMetadata {
  targetKey: string;
  position: XYPosition;
}

export interface FunctionMetadata {
  reactFlowGuid: string;
  functionKey: string;
  locations: FunctionPositionMetadata[];
  connections: string[];
}

export interface MapMetadata {
  functionNodes: FunctionMetadata[];
}
