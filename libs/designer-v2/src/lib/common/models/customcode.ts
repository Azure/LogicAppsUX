export interface CustomCode {
  nodeId: string;
  fileExtension: string;
  isModified?: boolean;
  isDeleted?: boolean;
}

export interface CustomCodeWithData extends CustomCode {
  fileData?: string;
}

export type CustomCodeFileNameMapping = Record<string, CustomCodeWithData>;

export interface AllCustomCodeFiles {
  customCodeFiles: CustomCodeFileNameMapping;
  // appFiles will be stored as [fileName: fileData]
  // note app files are stored at the app level and not the workflow level
  appFiles: Record<string, string>;
}
