import { AssertionErrorCode, AssertionException } from '@microsoft/logic-apps-designer';

export enum ContentType {
  Inputs,
  Outputs,
}

export interface IHostService {
  fetchAndDisplayContent(title: string, url: string, type: ContentType): void;
  openWorkflowParametersBlade?(): void;
}

let service: IHostService;

export const InitHostService = (hostService: IHostService): void => {
  service = hostService;
};

export const HostService = (): IHostService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'Host Service needs to be initialized before using');
  }

  return service;
};
