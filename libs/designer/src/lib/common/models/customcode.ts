export interface CustomCode {
  nodeId: string;
  fileExtension: string;
  isModified?: boolean;
  isDeleted?: boolean;
}

export interface CustomCodeWithData extends CustomCode {
  fileData: string;
}

export type CustomCodeFileNameMapping = Record<string, CustomCodeWithData>;
