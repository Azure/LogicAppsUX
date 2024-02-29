import { BaseException } from '@microsoft/logic-apps-shared';

export const ServiceExceptionName = 'Host.ServiceException';

export const ServiceExceptionCode = {
  API_MANAGEMENT_ARM_RESOURCE_FETCH_FAILED: 'ApiManagementArmResourceFetchFailed',
  AUTHORIZATION_FAILED: 'AuthorizationFailed',
  FETCH_SWAGGER_FAILED: 'FetchSwaggerFailed',
  FETCH_AZURE_BLOB_CONNECTION_PARAMETERS_FAILED: 'FetchAzureBlobConnectionParametersFailed',
  FETCH_AZURE_TABLE_CONNECTION_PARAMETERS_FAILED: 'FetchAzureTableConnectionParametersFailed',
  FETCH_EVENT_HUB_CONNECTION_PARAMETERS_FAILED: 'FetchEventHubConnectionParametersFailed',
  FETCH_DOCUMENT_DB_CONNECTION_PARAMETERS_FAILED: 'FetchDocumentDBConnectionParametersFailed',
  FETCH_INTEGRATION_ACCOUNT_CONNECTION_PARAMETERS_FAILED: 'FetchIntegrationAccountConnectionParametersFailed',
  FETCH_SERVICE_BUS_CONNECTION_PARAMETERS_FAILED: 'FetchServiceBusConnectionParametersFailed',
  GET_CALL_FAILED: 'GetCallFailed',
  POST_CALL_FAILED: 'PostCallFailed',
  RESPONSE_BODY_ERROR_NOT_DEFINED: 'ResponseBodyErrorNotDefined',
  RESPONSE_BODY_ERROR_MESSAGE_NOT_DEFINED: 'ResponseBodyErrorMessageNotDefined',
  RESPONSE_BODY_NOT_DEFINED: 'ResponseBodyNotDefined',
  RESPONSE_NOT_DEFINED: 'ResponseNotDefined',
} as const;
export type ServiceExceptionCode = (typeof ServiceExceptionCode)[keyof typeof ServiceExceptionCode];

export class ServiceException extends BaseException {
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
    throw new ServiceException('Unexpected HTTP response', ServiceExceptionCode.RESPONSE_NOT_DEFINED);
  } else if (!response.ok) {
    const { body } = response;
    if (!body) {
      throw new ServiceException(`Unexpected HTTP response: ${response.status}`, ServiceExceptionCode.RESPONSE_BODY_NOT_DEFINED);
    }

    const { error } = body;
    if (!error) {
      throw new ServiceException(`Unexpected HTTP response: ${response.status}`, ServiceExceptionCode.RESPONSE_BODY_ERROR_NOT_DEFINED);
    }

    const { message } = error;
    if (!message) {
      throw new ServiceException(
        `Unexpected HTTP response: ${response.status}`,
        ServiceExceptionCode.RESPONSE_BODY_ERROR_MESSAGE_NOT_DEFINED,
        {
          error,
        }
      );
    }

    throw new ServiceException(message);
  }
};
