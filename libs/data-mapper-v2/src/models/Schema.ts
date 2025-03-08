import type { SchemaType } from '@microsoft/logic-apps-shared';

export interface FileWithVsCodePath extends File {
  path?: string;
}
export interface SchemaFile {
  name: string;
  path: string;
  type: SchemaType;
}
