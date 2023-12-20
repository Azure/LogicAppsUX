import type { AssertionDefintion } from '@microsoft/utils-logic-apps';

export interface AddMockResultPayload {
  operationName: string;
  mockResult: string;
}

export interface InitDefintionPayload {
  assertions: string[];
  mockResults: { [key: string]: string };
}

export interface AddAssertionPayload {
  assertions: Record<string, AssertionDefintion>;
}

export interface UnitTestState {
  mockResults: { [key: string]: string };
  assertions: Record<string, AssertionDefintion>;
}
