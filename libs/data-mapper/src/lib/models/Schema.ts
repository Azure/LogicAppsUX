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
  qName: string;
  type: NormalizedDataType;

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
  None = 'None',
  Optional = 'Optional',
  Repeating = 'Repeating',
  Attribute = 'Attribute',
  Complex = 'Complex',
  MaxDepth = 'MaxDepth',
  Cyclic = 'Cyclic',
  JArray = 'JArray',
  ArrayItem = 'ArrayItem',
  AnyOf = 'AnyOf',
}

export enum NormalizedDataType {
  Any = 'Any',
  Array = 'Array',
  Binary = 'Binary',
  Boolean = 'Bool',
  Complex = 'Complex',
  DateTime = 'DateTime',
  Decimal = 'Decimal',
  Integer = 'Integer',
  Number = 'Number',
  Object = 'Object',
  String = 'String',
}

export enum InputFormat {
  TextBox = 'TextBox',
  FilePicker = 'FilePicker',
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
  // Used only in ArrayItem arrays, not regular arrays
  arrayItemIndex?: number | undefined;
}

export interface PathItem {
  key: string;
  name: string;
  qName: string;
  repeating: boolean;
}

export enum SchemaType {
  Source = 'source',
  Target = 'target',
}

export type SchemaNodeDictionary = { [key: string]: SchemaNodeExtended };
export type NamespaceDictionary = { [key: string]: string };
