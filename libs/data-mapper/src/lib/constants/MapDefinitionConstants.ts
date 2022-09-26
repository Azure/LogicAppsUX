export const yamlFormats = {
  indentGap: '  ',
  newLine: '\n',
};

export const reservedMapDefinitionKeys = {
  version: '$version',
  sourceFormat: '$input',
  targetFormat: '$output',
  sourceSchemaName: '$sourceSchema',
  targetSchemaName: '$targetSchema',
  sourceNamespaces: '$sourceNamespaces',
  targetNamespaces: '$targetNamespaces',
};

// Should contain a list of all the reserved keys from above
export const reservedMapDefinitionKeysArray: string[] = [
  reservedMapDefinitionKeys.version,
  reservedMapDefinitionKeys.sourceFormat,
  reservedMapDefinitionKeys.targetFormat,
  reservedMapDefinitionKeys.sourceSchemaName,
  reservedMapDefinitionKeys.targetSchemaName,
  reservedMapDefinitionKeys.sourceNamespaces,
  reservedMapDefinitionKeys.targetNamespaces,
];

export const mapNodeParams = {
  for: '$for',
  if: '$if',
  value: '$value',
};

export const mapDefinitionVersion = '1.0';
