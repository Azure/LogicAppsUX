import { BaseException } from '@microsoft-logic-apps/utils';

export enum MissingSchemaNameExceptionCode {
  MISSING_SCHEMA_NAME = 'MissingSchemaName',
}

export const MissingSchemaNameExceptionName = 'Workflow.MissingSchemaNameExceptionName';

export class MissingSchemaNameException extends BaseException {
  constructor(message: string, code?: MissingSchemaNameExceptionCode, data?: Record<string, any>) {
    super(MissingSchemaNameExceptionName, message, code, data);
  }
}
