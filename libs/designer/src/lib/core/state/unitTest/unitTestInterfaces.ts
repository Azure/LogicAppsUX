import type { ValueSegment, Assertion, AssertionDefinition } from '@microsoft/logic-apps-shared';

export interface updateMockResultPayload {
  operationName: string;
  actionResult: string;
  completed: boolean;
  errorMessage?: string;
  errorCode?: string;
}

export interface updateMockPayload {
  operationName: string;
  outputs: ValueSegment[];
  outputId: string;
  completed: boolean;
  type: string;
  errorMessage?: string;
  errorCode?: string;
}

export interface OutputMock {
  errorCode?: string;
  errorMessage?: string;
  output: Record<string, ValueSegment[]>;
  actionResult: string;
  isCompleted?: boolean;
}

export interface InitDefintionPayload {
  assertions: Assertion[];
  mockResults: Record<string, OutputMock>;
}

export interface AddAssertionPayload {
  assertion: AssertionDefinition;
}

export interface DeleteAssertionsPayload {
  assertionId: string;
}

export interface UpdateAssertionPayload {
  assertionToUpdate: AssertionDefinition;
}

export interface UpdateAssertioExpressionPayload {
  id: string;
  assertionString: string;
}

export interface UnitTestState {
  mockResults: Record<string, OutputMock>;
  assertions: Record<string, AssertionDefinition>;
  validationErrors: {
    assertions: Record<string, Record<string, string | undefined>>;
    mocks: Record<string, Record<string, string | undefined>>;
  };
}
