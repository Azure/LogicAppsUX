import type { Assertion, AssertionDefintion } from '@microsoft/utils-logic-apps';

export interface updateOutputMockPayload {
  operationName: string;
  mockResult: OutputMock;
}

export interface OutputMock {
  output: string;
  actionResult: string;
}

export interface InitDefintionPayload {
  assertions: Assertion[];
  mockResults: Record<string, OutputMock>;
}

export interface UpdateAssertionsPayload {
  assertions: Record<string, AssertionDefintion>;
}

export interface UpdateAssertionPayload {
  assertionToUpdate: AssertionDefintion;
}

export interface UnitTestState {
  mockResults: Record<string, OutputMock>;
  assertions: Record<string, AssertionDefintion>;
  validationErrors: Record<string, Record<string, string | undefined>>;
}
