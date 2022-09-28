export interface Schema {
  name: string;
  type: SchemaType;
  targetNamespace: string;
  namespaces?: NamespaceDictionary;
  schemaTreeRoot: SchemaNode;
}

export interface SchemaNode {
  key: string;
  name: string;
  namespacePrefix: string;
  namespaceUri: string;
  // Optional until we get it in the system
  parentDataType?: ParentDataType;
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

export enum ParentDataType {
  Integer = 'Integer',
  Decimal = 'Decimal',
  Number = 'Number',
  Binary = 'Binary',
  Boolean = 'Bool',
  String = 'String',
  DateTime = 'DateTime',
  Object = 'Object',
  Any = 'Any',
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
  Source = 'source',
  Target = 'target',
}

export type SchemaNodeDictionary = { [key: string]: SchemaNodeExtended };
export type NamespaceDictionary = { [key: string]: string };
