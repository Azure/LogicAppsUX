import type { Rect, XYPosition } from '@xyflow/react';

export type MapDefinitionEntry = {
  [key: string]: MapDefinitionEntry | string | MapDefinitionEntry[];
};

export type MapDefinitionEntryV2 = Map<string, MapDefinitionEntryV2 | string> | string;

export interface FunctionPositionMetadata {
  targetKey: string;
  position: XYPosition;
}

export interface FunctionMetadata {
  reactFlowGuid: string;
  functionKey: string;
  position: XYPosition;
  connections: ConnectionAndOrder[];
  connectionShorthand: string;
}

export interface FunctionMetadataV1 {
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

export interface MapMetadataV2 {
  canvasRect: Rect;
  functionNodes: FunctionMetadata[];
}

export const emptyCanvasRect: Rect = {
  x: -1,
  y: -1,
  width: 0,
  height: 0,
};

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
  fullPath: string;
}
export interface MapMetadataV1 {
  functionNodes: FunctionMetadataV1[];
}
