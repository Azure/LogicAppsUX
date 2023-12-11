export interface AddMockResultPayload {
  operationName: string;
  mockResult: string;
}

export interface AddAssertionPayload {
  assertion: string;
}

export interface UnitTestState {
  mockResults: Map<string, string>;
  assertions: string[];
}
