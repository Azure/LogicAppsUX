export interface Schema {
  name: string;
  type: SchemaFileFormat;
  targetNamespace: string;
  namespaces?: NamespaceDictionary;
  schemaTreeRoot: SchemaNode;
}

export interface SchemaNode {
  key: string;
  name: string;
  fullName: string;
  parentKey?: string;
  namespacePrefix?: string;
  namespaceUri?: string;
  normalizedDataType: NormalizedDataType;
  schemaNodeDataType: SchemaNodeDataType;

  /**
   * @deprecated Do not use, but do not remove. Is parsed on the extended node - nodeProperties
   * @see SchemaNodeExtended
   */
  properties: string;
  children: SchemaNode[];
}

export enum SchemaFileFormat {
  NotSpecified = 'NotSpecified',
  XML = 'XML',
  JSON = 'JSON',
}

export enum SchemaNodeProperty {
  NotSpecified = 'NotSpecified',
  Optional = 'Optional',
  Repeating = 'Repeating',
  Attribute = 'Attribute',
  ComplexTypeSimpleContent = 'ComplexTypeSimpleContent',
  MaximumDepthLimit = 'MaximumDepthLimit',
  CyclicTypeReference = 'CyclicTypeReference',
}

export enum SchemaNodeDataType {
  AnyAtomicType = 'AnyAtomicType',
  AnyUri = 'AnyUri',
  Attribute = 'Attribute',
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

export enum NormalizedDataType {
  ComplexType = 'ComplexType',
  Integer = 'Integer',
  Decimal = 'Decimal',
  Number = 'Number',
  Binary = 'Binary',
  Boolean = 'Bool',
  String = 'String',
  DateTime = 'DateTime',
  Any = 'Any',
}

export interface SchemaExtended extends Schema {
  schemaTreeRoot: SchemaNodeExtended;
}

export interface SchemaNodeExtended extends SchemaNode {
  children: SchemaNodeExtended[];
  nodeProperties: SchemaNodeProperty[];
  // Inclusive of the current node
  pathToRoot: PathItem[];
}

export interface PathItem {
  key: string;
  name: string;
  fullName: string;
  repeating: boolean;
}

export enum SchemaType {
  Source = 'source',
  Target = 'target',
}

export type SchemaNodeDictionary = { [key: string]: SchemaNodeExtended };
export type NamespaceDictionary = { [key: string]: string };
