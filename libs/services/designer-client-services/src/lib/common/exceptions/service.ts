import { BaseException } from '@microsoft-logic-apps/utils';

export const ServiceExceptionName = 'Host.ServiceException';

export enum ServiceExceptionCode {
  API_MANAGEMENT_ARM_RESOURCE_FETCH_FAILED = 'ApiManagementArmResourceFetchFailed',
  AUTHORIZATION_FAILED = 'AuthorizationFailed',
  FETCH_SWAGGER_FAILED = 'FetchSwaggerFailed',
  FETCH_AZURE_BLOB_CONNECTION_PARAMETERS_FAILED = 'FetchAzureBlobConnectionParametersFailed',
  FETCH_AZURE_TABLE_CONNECTION_PARAMETERS_FAILED = 'FetchAzureTableConnectionParametersFailed',
  FETCH_EVENT_HUB_CONNECTION_PARAMETERS_FAILED = 'FetchEventHubConnectionParametersFailed',
  FETCH_DOCUMENT_DB_CONNECTION_PARAMETERS_FAILED = 'FetchDocumentDBConnectionParametersFailed',
  FETCH_INTEGRATION_ACCOUNT_CONNECTION_PARAMETERS_FAILED = 'FetchIntegrationAccountConnectionParametersFailed',
  FETCH_SERVICE_BUS_CONNECTION_PARAMETERS_FAILED = 'FetchServiceBusConnectionParametersFailed',
  GET_CALL_FAILED = 'GetCallFailed',
  POST_CALL_FAILED = 'PostCallFailed',

  ResponseBodyErrorNotDefined = 'ResponseBodyErrorNotDefined',
  ResponseBodyErrorMessageNotDefined = 'ResponseBodyErrorMessageNotDefined',
  ResponseBodyNotDefined = 'ResponseBodyNotDefined',
  ResponseNotDefined = 'ResponseNotDefined',
}

export class ServiceException extends BaseException {
  // tslint:disable-next-line: no-any
  constructor(message: string, code?: string, data?: Record<string, any>) {
    super(ServiceExceptionName, message, code, data);
  }
}

export interface HttpResponse<T> {
  body?: T;
  headers: Headers;
  ok: boolean;
  status: number;
  url: string;
}

export const throwWhenNotOk = (response: HttpResponse<any>) => {
  if (!response) {
    throw new ServiceException('Unexpected HTTP response', ServiceExceptionCode.ResponseNotDefined);
  } else if (!response.ok) {
    const { body } = response;
    if (!body) {
      throw new ServiceException(`Unexpected HTTP response: ${response.status}`, ServiceExceptionCode.ResponseBodyNotDefined);
    }

    const { error } = body;
    if (!error) {
      throw new ServiceException(`Unexpected HTTP response: ${response.status}`, ServiceExceptionCode.ResponseBodyErrorNotDefined);
    }

    const { message } = error;
    if (!message) {
      throw new ServiceException(`Unexpected HTTP response: ${response.status}`, ServiceExceptionCode.ResponseBodyErrorMessageNotDefined, {
        error,
      });
    }

    throw new ServiceException(message);
  }
};
