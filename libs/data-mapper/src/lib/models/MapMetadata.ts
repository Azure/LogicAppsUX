import type { XYPosition } from 'reactflow';

export interface FunctionPositionMetadata {
  targetKey: string;
  position: XYPosition;
}

export interface FunctionMetadata {
  reactFlowGuid: string;
  functionKey: string;
  positions: FunctionPositionMetadata[];
  connections: ConnectionAndOrder[];
  connectionShorthand: string;
}

export interface ConnectionAndOrder {
  name: string;
  inputOrder: number;
}

export interface MapMetadata {
  functionNodes: FunctionMetadata[];
}
