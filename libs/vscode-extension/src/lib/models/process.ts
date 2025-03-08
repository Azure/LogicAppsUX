export interface IProcessInfo {
  pid: number;
  ppid?: number;
  name: string;

  /**
   * The working set size of the process, in bytes.
   */
  memory?: number;

  /**
   * The string returned is at most 512 chars, strings exceeding this length are truncated.
   */
  commandLine?: string;
}

export interface IProcessTreeNode {
  pid: number;
  name: string;
  memory?: number;
  commandLine?: string;
  children: IProcessTreeNode[];
}
