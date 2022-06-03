import { BaseException } from '@microsoft-logic-apps/utils';

export enum InvalidFormatExceptionCode {
  MISSING_MAPPINGS_PARAM = 'MissingMappingParam',
  INVALID_YAML_FORMAT = 'InvalidYamlFormat',
}

export const InvalidFormatExceptionName = 'Workflow.InvalidFormatExceptionName';

export class InvalidFormatException extends BaseException {
  constructor(message: string, code?: InvalidFormatExceptionCode, data?: Record<string, any>) {
    super(InvalidFormatExceptionName, message, code, data);
  }
}
