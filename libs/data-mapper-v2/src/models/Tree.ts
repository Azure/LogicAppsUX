export type IFileSysTreeItem = ITreeDirectory | ITreeFile;

export interface ITreeDirectory {
  name: string;
  type: 'directory';
  children: IFileSysTreeItem[];
}

export interface ITreeFile {
  name: string;
  type: 'file';
  fullPath?: string;
}
