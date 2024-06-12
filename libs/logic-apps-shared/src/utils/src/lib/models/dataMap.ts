import type { XYPosition } from 'reactflow';

export type MapDefinitionEntry = { [key: string]: MapDefinitionEntry | string | MapDefinitionEntry[] };

export interface FunctionPositionMetadata {
  targetKey: string;
  position: XYPosition;
}

export interface FunctionMetadata {
  reactFlowGuid: string;
  functionKey: string;
  positions: FunctionPositionMetadata[];
  connections: ConnectionAndOrder[];
  connectionShorthand: string;
}

export interface ConnectionAndOrder {
  name: string;
  inputOrder: number;
}

export interface MapMetadata {
  functionNodes: FunctionMetadata[];
}

// For Schema File System
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
