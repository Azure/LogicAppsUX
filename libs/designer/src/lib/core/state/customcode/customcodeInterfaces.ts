import type { CustomCode } from '../../../common/models/customcode';

export interface CustomCodeState {
  // by fileName
  files: Record<string, CustomCode>;
  // by nodeId
  fileData: Record<string, string>;
}

export interface AddCustomCodePayload {
  nodeId: string;
  fileData: string;
  fileExtension: string;
  fileName: string;
}

export interface DeleteCustomCodePayload {
  nodeId: string;
  fileName: string;
}

export interface RenameCustomCodePayload {
  nodeId: string;
  oldFileName: string;
  newFileName: string;
}
