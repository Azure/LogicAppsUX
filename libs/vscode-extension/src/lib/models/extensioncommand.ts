export enum ExtensionCommand {
  select_folder = 'select-folder',
  initialize = 'initialize',
  loadRun = 'LoadRun',
  dispose = 'dispose',
  initialize_frame = 'initialize-frame',
  update_access_token = 'update-access-token',
  update_export_path = 'update-export-path',
  export_package = 'export-package',
  add_status = 'add-status',
  set_final_status = 'set-final-status',
  save = 'Save',
  showContent = 'ShowContent',
  resubmitRun = 'ResubmitRun',
  addConnection = 'add-connection',
  createFileSystemConnection = 'create-file-system-connection',
  completeFileSystemConnection = 'complete-file-system-connection',
  getCallbackUrl = 'GetCallbackUrl',
  receiveCallback = 'ReceiveCallback',
  openOauthLoginPopup = 'OpenLoginPopup',
  completeOauthLogin = 'CompleteOauthLogin',
}

export interface IExtensionsJson {
  recommendations?: string[];
}
