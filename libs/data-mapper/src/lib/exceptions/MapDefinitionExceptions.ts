import { BaseException } from '@microsoft/utils-logic-apps';

export const InvalidFormatExceptionCode = {
  MISSING_MAPPINGS_PARAM: 'MissingMappingParam',
  MISSING_SCHEMA_NAME: 'MissingSchemaName',
  INVALID_YAML_FORMAT: 'InvalidYamlFormat',
} as const;
export type InvalidFormatExceptionCode = (typeof InvalidFormatExceptionCode)[keyof typeof InvalidFormatExceptionCode];

export const InvalidFormatExceptionName = 'Workflow.InvalidFormatExceptionName';

export class InvalidFormatException extends BaseException {
  constructor(message: string, code?: InvalidFormatExceptionCode, data?: Record<string, any>) {
    super(InvalidFormatExceptionName, message, code, data);
  }
}
