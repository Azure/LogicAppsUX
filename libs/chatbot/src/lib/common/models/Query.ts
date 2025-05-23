import type { Workflow } from '@microsoft/logic-apps-shared';

export interface RequestData {
  properties: {
    workflow: Workflow;
    query: string;
  };
}

export interface ResponseData {
  properties: {
    queryId: string;
    createdTime: string;
    completedTime: string;
    response: string;
    additionalParameters?: string[];
  };
}
