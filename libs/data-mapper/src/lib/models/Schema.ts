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

// TODO (nicolas): Extend this once we know what other properties
// need to be known for properties pane
// Extra Note: Will likely have to split into SchemaNode and ExpressionNode
// types as properties are starting to appear quite different
export interface SelectedNode {
  type: NodeType;
  name: string;
  path: string;
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

export enum SchemaTypes {
  Input = 'input',
  Output = 'output',
}

export enum NodeType {
  Input = 'input',
  Output = 'output',
  Expression = 'expression',
}

export type SchemaNodeDictionary = { [key: string]: SchemaNodeExtended };
