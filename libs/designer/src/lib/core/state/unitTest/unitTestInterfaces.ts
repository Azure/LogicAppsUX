import { type ValueSegment } from '@microsoft/designer-client-services-logic-apps';
import type { Assertion, AssertionDefintion } from '@microsoft/utils-logic-apps';

export interface updateOutputMockResultPayload {
  operationName: string;
  actionResult: string;
}

export interface updateOutputMockPayload {
  operationName: string;
  outputs: ValueSegment[];
  outputId: string;
}

export interface OutputMock {
  output: Record<string, ValueSegment[]>;
  actionResult: string;
  isCompleted?: boolean;
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
