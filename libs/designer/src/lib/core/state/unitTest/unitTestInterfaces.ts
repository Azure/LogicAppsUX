import type { Assertion, AssertionDefintion } from '@microsoft/utils-logic-apps';

export interface AddMockResultPayload {
  operationName: string;
  mockResult: string;
}

export interface InitDefintionPayload {
  assertions: Assertion[];
  mockResults: { [key: string]: string };
}

export interface UpdateAssertionsPayload {
  assertions: Record<string, AssertionDefintion>;
}

export interface UpdateAssertionPayload {
  assertionToUpdate: AssertionDefintion;
}

export interface UnitTestState {
  mockResults: { [key: string]: string };
  assertions: Record<string, AssertionDefintion>;
}
