export interface JsonInputStyle {
  srcSchemaName?: string;
  dstSchemaName?: string;
  mappings: MapNode;
}

export interface MapNode {
  targetNodeKey: string;
  children?: MapNode[];
  targetValue?: { value: string };
  loopSource?: { loopSource: string };
  condition?: { condition: string };
}
