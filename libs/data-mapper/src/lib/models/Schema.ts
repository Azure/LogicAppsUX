export interface Schema {
  name: string;
  type: SchemaType;
  targetNamespace: string;
  namespaces: Map<string, string>;
  schemaTreeRoot: SchemaNode;
}

export interface SchemaNode {
  key: string;
  name: string;
  namespacePrefix: string;
  namespaceUri: string;
  schemaNodeDataType: string; // XmlTypeCode
  properties: SchemaNodeProperties;
  optional?: boolean;
  repeating?: boolean;
  attribute?: boolean;
  children: SchemaNode[];
}

export enum SchemaType {
  NotSpecified = 'NotSpecified',
  XML = 'XML',
  JSON = 'JSON',
}

export enum SchemaNodeProperties {
  NotSpecified = 0,
  Optional = 1,
  Repeating = 2,
  Attribute = 4,
}

export interface SchemaExtended extends Schema {
  schemaTreeRoot: SchemaNodeExtended;
}

export interface SchemaNodeExtended extends SchemaNode {
  children: SchemaNodeExtended[];
  // Inclusive of the current node
  pathToRoot: PathItem[];
}

export interface PathItem {
  key: string;
  name: string;
}

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
