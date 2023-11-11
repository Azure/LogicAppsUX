import { BaseException } from './baseexception';

export const ValidationExceptionName = 'Core.ValidationException';

export enum ValidationErrorCode {
  INVALID_CONNECTIONS = 'InvalidConnections',
  INVALID_DEPENDSON_CONDITIONS = 'InvalidDependsOnConditions',
  INVALID_PARAMETERS = 'InvalidParameters',
  INVALID_PROPERTY_FOR_UNTIL_ACTION = 'InvalidUntilActionProperty',
  INVALID_CONNECTION_NAME = 'InvalidConnectionName',
  INVALID_CONNECTIONS_IN_WORKFLOW_PARAMETERS = 'InvalidConnectionsInWorkflowParameters',
  INVALID_VALUE_SEGMENT_TYPE = 'InvalidValueSegmentType',
  MISSING_CONNECTIONS_IN_WORKFLOW_PARAMETERS = 'MissingConnectionsInWorkflowParameters',
  UNSPECIFIED = 'Unspecified',
}

export class ValidationException extends BaseException {
  constructor(code: ValidationErrorCode, message: string, data?: Record<string, any>) {
    super(ValidationExceptionName, message, code, data);
  }
}
