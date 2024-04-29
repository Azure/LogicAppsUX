import { SchemaType } from '@microsoft/logic-apps-shared';

export type SelectExistingSchemaProps = {
  errorMessage: string;
  schemaType?: SchemaType;
  setSelectedSchema: (item: string | undefined) => void;
};

export type FileTreeItem = FileTreeDirectory | FileTreeFile;

export interface FileTreeDirectory {
  name: string;
  type: 'directory';
  children: FileTreeItem[];
}

export interface FileTreeFile {
  name: string;
  type: 'file';
  fullPath?: string;
}
