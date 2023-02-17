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
  normalizedDataType: NormalizedDataType;

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
  JsonArray = 'JsonArray',
  ArrayItem = 'ArrayItem',
  AnyOf = 'AnyOf',
}

export enum NormalizedDataType {
  Any = 'Any',
  Binary = 'Binary',
  Boolean = 'Bool',
  ComplexType = 'ComplexType',
  DateTime = 'DateTime',
  Decimal = 'Decimal',
  Integer = 'Integer',
  Number = 'Number',
  String = 'String',
}

export interface SchemaExtended extends Schema {
  schemaTreeRoot: SchemaNodeExtended;
}

export interface SchemaNodeExtended extends SchemaNode {
  children: SchemaNodeExtended[];
  nodeProperties: SchemaNodeProperty[];
  // Inclusive of the current node
  pathToRoot: PathItem[];
  parentKey: string | undefined;
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
