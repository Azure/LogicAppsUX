import type { ContentLink, Runs, Run, RunError, LogicAppsV2, MessageEntry } from '../../utils/src';
import { AssertionException, AssertionErrorCode } from '../../utils/src';
import type { CallbackInfo } from './callbackInfo';

export interface IRunService {
  getContent(contentLink: ContentLink): Promise<any>;
  getMoreRuns(continuationToken: string): Promise<Runs>;
  getRun(runId: string): Promise<Run | RunError>;
  getRuns(): Promise<Runs>;
  runTrigger(callbackInfo: CallbackInfo, options?: any, isDraftMode?: boolean): Promise<any>;
  getActionLinks(action: any, nodeId: string): Promise<any>;
  getScopeRepetitions(
    action: { nodeId: string; runId: string | undefined },
    status?: string
  ): Promise<{ value: LogicAppsV2.RunRepetition[]; nextLink?: string }>;
  getMoreScopeRepetitions(continuationToken: string): Promise<{ value: LogicAppsV2.RunRepetition[]; nextLink?: string }>;
  getTimelineRepetitions(runId: string): Promise<any>;
  getAgentRepetition(action: { nodeId: string; runId: string | undefined }, repetitionId: string): Promise<LogicAppsV2.RunRepetition>;
  getAgentActionsRepetition(action: { nodeId: string; runId: string | undefined }, repetitionId: string): Promise<any>;
  getMoreAgentActionsRepetition(continuationToken: string): Promise<any>;
  getRepetition(action: { nodeId: string; runId: string | undefined }, repetitionId: string): Promise<LogicAppsV2.RunRepetition>;
  getActionChatHistory(action: { nodeId: string; runId: string | undefined }): Promise<MessageEntry[]>;
  getRunChatHistory(runId: string): Promise<MessageEntry[]>;
  getAgentChatInvokeUri(action: { idSuffix: string }): Promise<any>;
  invokeAgentChat(action: { id: string; data: any }): Promise<any>;
  resubmitRun(runId: string, triggerName: string): Promise<void>;
  cancelRun(runId: string): Promise<any>;
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
