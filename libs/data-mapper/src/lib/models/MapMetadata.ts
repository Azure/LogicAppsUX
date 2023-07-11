export interface FunctionLocationMetadata {
  targetKey: string;
  xPos: number;
  yPos: number;
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
