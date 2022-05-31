export interface JsonInputStyle {
  srcSchemaName?: string;
  dstSchemaName?: string;
  mappings: Node;
}

export interface Node {
  targetNodeKey: string;
  children?: Node[];
  targetValue?: { value: string };
  loopSource?: { loopSource: string };
  condition?: { condition: string };
}
