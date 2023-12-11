export const ExtensionCommand = {
  addSchemaFromFile: 'addSchemaFromFile',
  select_folder: 'select-folder',
  initialize: 'initialize',
  loadRun: 'LoadRun',
  dispose: 'dispose',
  fetchSchema: 'fetchSchema',
  getConfigurationSetting: 'getConfigurationSetting',
  getAvailableCustomXsltPaths: 'getAvailableCustomXsltPaths',
  initialize_frame: 'initialize-frame',
  loadDataMap: 'loadDataMap',
  update_access_token: 'update-access-token',
  update_export_path: 'update-export-path',
  update_panel_metadata: 'update-panel-metadata',
  export_package: 'export-package',
  getFunctionDisplayExpanded: 'getFunctionDisplayExpanded',
  add_status: 'add-status',
  saveDataMapDefinition: 'saveDataMapDefinition',
  saveDataMapMetadata: 'saveDataMapMetadata',
  saveDataMapXslt: 'saveDataMapXslt',
  saveDraftDataMapDefinition: 'saveDraftDataMapDefinition',
  set_final_status: 'set-final-status',
  setIsMapStateDirty: 'setIsMapStateDirty',
  setRuntimePort: 'setRuntimePort',
  setXsltData: 'setXsltData',
  save: 'Save',
  showContent: 'ShowContent',
  showAvailableSchemas: 'showAvailableSchemas',
  readLocalCustomXsltFileOptions: 'readLocalCustomXsltFileOptions',
  readLocalSchemaFileOptions: 'readLocalSchemaFileOptions',
  resubmitRun: 'ResubmitRun',
  addConnection: 'add-connection',
  createFileSystemConnection: 'create-file-system-connection',
  completeFileSystemConnection: 'complete-file-system-connection',
  getCallbackUrl: 'GetCallbackUrl',
  receiveCallback: 'ReceiveCallback',
  openOauthLoginPopup: 'OpenLoginPopup',
  completeOauthLogin: 'CompleteOauthLogin',
  webviewLoaded: 'webviewLoaded',
  webviewRscLoadError: 'webviewRscLoadError',
  saveUnitTest: 'saveUnitTest',
} as const;
export type ExtensionCommand = (typeof ExtensionCommand)[keyof typeof ExtensionCommand];

export interface IExtensionsJson {
  recommendations?: string[];
}
