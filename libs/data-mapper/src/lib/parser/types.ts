export interface JsonInputStyle {
  srcSchemaName?: string;
  dstSchemaName?: string;
  mappings: Node;
}

export interface Node {
  targetNodeKey: string;
  children?: Node[];
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
