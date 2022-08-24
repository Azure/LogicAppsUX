import type { PathItem, Schema, SchemaExtended, SchemaNode, SchemaNodeExtended } from '../models/Schema';

export const convertSchemaToSchemaExtended = (schema: Schema): SchemaExtended => {
  const extendedSchema: SchemaExtended = {
    ...schema,
    schemaTreeRoot: convertSchemaNodeToSchemaNodeExtended(schema.schemaTreeRoot, []),
  };

  return extendedSchema;
};

const convertSchemaNodeToSchemaNodeExtended = (schemaNode: SchemaNode, parentPath: PathItem[]): SchemaNodeExtended => {
  const pathToRoot: PathItem[] = [...parentPath, { key: schemaNode.key, name: schemaNode.name }];

  const extendedSchemaNode: SchemaNodeExtended = {
    ...schemaNode,
    children: schemaNode.children ? schemaNode.children.map((child) => convertSchemaNodeToSchemaNodeExtended(child, pathToRoot)) : [],
    pathToRoot: pathToRoot,
  };

  return extendedSchemaNode;
};
