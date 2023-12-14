export interface AddMockResultPayload {
  operationName: string;
  mockResult: string;
}

export interface InitDefintionPayload {
  assertions: string[];
  mockResults: Map<string, string>;
}

export interface AddAssertionPayload {
  assertion: string;
}

export interface UnitTestState {
  mockResults: Map<string, string>;
  assertions: string[];
}
