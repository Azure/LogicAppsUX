export interface OperationMock {
  outputs?: string;
  properties?: Record<string, string>;
}

export interface Assertion {
  assertionString: string;
  description: string;
}
