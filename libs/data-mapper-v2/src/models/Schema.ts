import type { SchemaType } from '@microsoft/logic-apps-shared';

export const UploadSchemaTypes = {
  UploadNew: 'upload-new',
  SelectFrom: 'select-from',
} as const;
export type UploadSchemaTypes = (typeof UploadSchemaTypes)[keyof typeof UploadSchemaTypes];

export interface FileWithVsCodePath extends File {
  path?: string;
}
export interface SchemaFile {
  name: string;
  path: string;
  type: SchemaType;
}
