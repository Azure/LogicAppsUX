export interface OperationMock {
  outputs?: string;
  properties?: Record<string, string>;
}

export interface Assertion {
  assertionString: string;
  description: string;
}

export interface UnitTestDefinition {
  triggerMocks: Record<string, OperationMock>;
  actionMocks: Record<string, OperationMock>;
  assertions: Assertion[];
}

export interface AssertionDefintion {
  name: string;
  description: string;
}
