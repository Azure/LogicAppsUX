import type { CustomCode } from '../../../common/models/customcode';

export interface CustomCodeState {
  // where we store the metadata for the custom code files
  files: Record<string, CustomCode>;
  // where we store the actual file data
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
