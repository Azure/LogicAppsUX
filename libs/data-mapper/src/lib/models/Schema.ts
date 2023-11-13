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

export const SchemaFileFormat = {
  NotSpecified: 'NotSpecified',
  XML: 'XML',
  JSON: 'JSON',
} as const;
export type SchemaFileFormat = (typeof SchemaFileFormat)[keyof typeof SchemaFileFormat];

export const SchemaNodeProperty = {
  None: 'None',
  Optional: 'Optional',
  Repeating: 'Repeating',
  Attribute: 'Attribute',
  Complex: 'Complex',
  MaxDepth: 'MaxDepth',
  Cyclic: 'Cyclic',
  JArray: 'JArray',
  ArrayItem: 'ArrayItem',
  AnyOf: 'AnyOf',
} as const;
export type SchemaNodeProperty = (typeof SchemaNodeProperty)[keyof typeof SchemaNodeProperty];
export const numericalDataType = 'Numerical'; // used by the frontend to describe Number, Integer and Decimal types

export const NormalizedDataType = {
  Any: 'Any',
  Array: 'Array',
  Binary: 'Binary',
  Boolean: 'Bool',
  Complex: 'Complex',
  DateTime: 'DateTime',
  Decimal: 'Decimal',
  Integer: 'Integer',
  Number: 'Number',
  Object: 'Object',
  String: 'String',
} as const;
export type NormalizedDataType = (typeof NormalizedDataType)[keyof typeof NormalizedDataType];
export const InputFormat = {
  TextBox: 'TextBox',
  FilePicker: 'FilePicker',
} as const;
export type InputFormat = (typeof InputFormat)[keyof typeof InputFormat];

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

export const SchemaType = {
  Source: 'source',
  Target: 'target',
} as const;
export type SchemaType = (typeof SchemaType)[keyof typeof SchemaType];

export type SchemaNodeDictionary = { [key: string]: SchemaNodeExtended };
export type NamespaceDictionary = { [key: string]: string };
