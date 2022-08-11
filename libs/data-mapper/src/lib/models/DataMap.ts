export interface DataMap {
  srcSchemaName: string;
  dstSchemaName: string;
  mappings: MapNode;
}

export interface MapNode {
  targetNodeKey: string;
  children?: MapNode[];
  targetValue?: ValueMapping;
  loopSource?: LoopMapping;
  condition?: ConditionalMapping;
}

export interface ValueMapping {
  value: string;
}

export interface LoopMapping {
  loopSource: string;
  loopIndex?: string;
}

export interface ConditionalMapping {
  condition: string;
}
