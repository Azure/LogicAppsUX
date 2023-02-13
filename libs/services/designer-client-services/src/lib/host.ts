import { AssertionErrorCode, AssertionException } from '@microsoft/utils-logic-apps';

export enum ContentType {
  Inputs,
  Outputs,
}

export interface IHostService {
  fetchAndDisplayContent(title: string, url: string, type: ContentType): void;
}

let service: IHostService;

export const InitHostService = (hostService: IHostService): void => {
  service = hostService;
};

export const HostService = (): IHostService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'Host Service need to be initialized before using');
  }

  return service;
};
