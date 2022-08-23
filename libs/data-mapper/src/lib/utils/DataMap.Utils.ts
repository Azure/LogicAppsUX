import type { MapNode, SchemaExtended, SchemaNodeExtended } from '../models';

export const generateBlankDataMapMapping = (outputSchema: SchemaExtended): MapNode => {
  return generateBlankChildDataMapMapping(outputSchema.schemaTreeRoot);
};

const generateBlankChildDataMapMapping = (node: SchemaNodeExtended): MapNode => {
  return {
    targetNodeKey: node.key,
    children: node.children.map((childNode) => generateBlankChildDataMapMapping(childNode)),
  };
};
