export interface IArtifactFile {
  name: string;
  path: string;
}

export interface Artifacts {
  maps: Record<string, FileDetails[]>;
  schemas: FileDetails[];
}

export interface FileDetails {
  name: string;
  fileName: string;
  relativePath: string;
}
