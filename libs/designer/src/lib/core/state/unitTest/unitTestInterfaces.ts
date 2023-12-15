export interface AddMockResultPayload {
  operationName: string;
  mockResult: string;
}

export interface InitDefintionPayload {
  assertions: string[];
  mockResults: { [key: string]: string };
}

export interface AddAssertionPayload {
  assertion: string;
}

export interface UnitTestState {
  mockResults: { [key: string]: string };
  assertions: string[];
}
