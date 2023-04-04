import type { CallbackInfo } from './workflow';
import type { ContentLink, Runs, RunError, Run } from '@microsoft/designer-ui';
import { AssertionErrorCode, AssertionException } from '@microsoft/utils-logic-apps';

export interface IRunService {
  getContent(contentLink: ContentLink): Promise<any>;
  getMoreRuns(continuationToken: string): Promise<Runs>;
  getRun(runId: string): Promise<Run | RunError>;
  getRuns(workflowId: string): Promise<Runs>;
  runTrigger(callbackInfo: CallbackInfo): Promise<any>;
  getActionLinks(action: any, nodeId: string): Promise<any>;
  getScopeRepetitions(action: any, status?: string): Promise<any>;
  getRepetition(action: any, repetitionId: string): Promise<any>;
}

let service: IRunService;

export const InitRunService = (RunService: IRunService): void => {
  service = RunService;
};

export const RunService = (): IRunService => {
  if (!service) {
    throw new AssertionException(AssertionErrorCode.SERVICE_NOT_INITIALIZED, 'Run Service need to be initialized before using');
  }

  return service;
};
