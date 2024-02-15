import { AssertionErrorCode, AssertionException } from '@microsoft/utils-logic-apps';

export const ContentType = {
  Inputs: 'inputs',
  Outputs: 'outputs',
} as const;
export type ContentType = (typeof ContentType)[keyof typeof ContentType];

export interface IHostService {
  fetchAndDisplayContent(title: string, url: string, type: ContentType): void;
  openWorkflowParametersBlade?(): void;
  openConnectionResource?(connectionId: string): void;
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
