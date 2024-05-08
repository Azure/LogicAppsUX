export type ITreeItem = ITreeDirectory | ITreeFile;

export interface ITreeDirectory {
  name: string;
  type: 'directory';
  children: ITreeItem[];
}

export interface ITreeFile {
  name: string;
  type: 'file';
  fullPath?: string;
}
