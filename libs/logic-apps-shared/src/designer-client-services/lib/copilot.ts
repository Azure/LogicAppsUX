import type { AxiosResponse } from 'axios';
import { AssertionErrorCode, AssertionException } from '../../utils/src';

export interface ICopilotService {
  getNl2fExpression: (query: string, signal: AbortSignal) => Promise<AxiosResponse<any>>;
}

let service: ICopilotService;

export const InitCopilotService = (copilotService: ICopilotService): void => {
  service = copilotService;
};

export const CopilotService = (): ICopilotService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'Copilot Service needs to be initialized before using');
  }

  return service;
};
