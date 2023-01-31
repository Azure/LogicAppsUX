import { NormalizedDataType, type SchemaNodeExtended, SchemaNodeProperty } from '../../models';

export const dummySchemaNode: SchemaNodeExtended = {
  key: '',
  name: '',
  fullName: '',
  normalizedDataType: NormalizedDataType.Integer,
  properties: SchemaNodeProperty.NotSpecified,
  nodeProperties: [SchemaNodeProperty.NotSpecified],
  children: [],
  pathToRoot: [],
} as SchemaNodeExtended;
