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
  schemaNodeDataType: SchemaNodeDataType;
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

export enum SchemaNodeDataType {
  ComplexType = 'ComplexType',
  AnyAtomicType = 'AnyAtomicType',
  AnyUri = 'AnyUri',
  Base64Binary = 'Base64Binary',
  Boolean = 'Boolean',
  Byte = 'Byte',
  Date = 'Date',
  DateTime = 'DateTime',
  Decimal = 'Decimal',
  Double = 'Double',
  Duration = 'Duration',
  Entity = 'Entity',
  Float = 'Float',
  GDay = 'GDay',
  GMonth = 'GMonth',
  GMonthDay = 'GMonthDay',
  GYear = 'GYear',
  GYearMonth = 'GYearMonth',
  HexBinary = 'HexBinary',
  Id = 'Id',
  Idref = 'Idref',
  Int = 'Int',
  Integer = 'Integer',
  Item = 'Item',
  Language = 'Language',
  Long = 'Long',
  Name = 'Name',
  NCName = 'NCName',
  NegativeInteger = 'NegativeInteger',
  NmToken = 'NmToken',
  None = 'None',
  NonNegativeInteger = 'NonNegativeInteger',
  NonPositiveInteger = 'NonPositiveInteger',
  NormalizedString = 'NormalizedString',
  Notation = 'Notation',
  PositiveInteger = 'PositiveInteger',
  QName = 'QName',
  Short = 'Short',
  String = 'String',
  Time = 'Time',
  Token = 'Token',
  UnsignedByte = 'UnsignedByte',
  UnsignedInt = 'UnsignedInt',
  UnsignedLong = 'UnsignedLong',
  UnsignedShort = 'UnsignedShort',
  UntypedAtomic = 'UntypedAtomic',
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
