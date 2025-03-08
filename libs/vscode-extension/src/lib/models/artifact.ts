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

/**
 * Describes the release info object response from https://api.github.com/repos/OWNER/REPO/releases
 */
export interface IGitHubReleaseInfo {
  /**
   * The version
   */
  tag_name?: string;

  /**
   * Name of release (includes version)
   */
  name?: string;
  body?: string;
  url?: string;
  assets_url?: string;
  upload_url?: string;
  id?: number;
}
