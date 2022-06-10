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
  parent: SchemaNode;
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
