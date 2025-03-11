export interface LogMessage {
  message: string;
  data?: any;
}

export const LogCategory = {
  DataMapperDesigner: 'DataMapperDesigner',
  FunctionsQuery: 'FunctionsQuery',
  InputDropDown: 'InputDropDown',
  InputTextbox: 'InputTextbox',
  FunctionNodePropertiesTab: 'FunctionNodePropertiesTab',
  TestMapPanel: 'TestMapPanel',
  SerializeDataMap: 'SerializeDataMap',
  DataMapUtils: 'DataMapUtils',
  EdgeUtils: 'EdgeUtils',
  FunctionUtils: 'FunctionUtils',
  IconUtils: 'IconUtils',
  ReactFlowUtils: 'ReactFlowUtils',
  ConnectionUtils: 'ConnectionUtils',
  ExtensionCommands: 'ExtensionCommands',
  MapDefinitionDeserializer: 'MapDefinitionDeserializer',
  DefaultConfigView: 'DefaultConfigView',
  AddOrUpdateSchemaView: 'AddOrUpdateSchemaView',
  FunctionIcon: 'FunctionIcon',
  CodeView: 'CodeView',
  TargetSchemaPane: 'TargetSchemaPane',
  OverviewCanvas: 'OverviewCanvas',
  EditingCanvas: 'EditingCanvas',
  FunctionList: 'FunctionList',
  SchemaUtils: 'SchemaUtils',
  VsixCommands: 'VsixCommands',
  DataMapSlice: 'DataMapSlice',
} as const;
export type LogCategory = (typeof LogCategory)[keyof typeof LogCategory];
