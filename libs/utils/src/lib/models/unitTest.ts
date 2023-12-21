export interface OperationMock {
  outputs?: string;
  properties?: Record<string, string>;
}

export interface Assertion {
  name: string;
  description: string;
  expression: any;
}

export interface UnitTestDefinition {
  triggerMocks: Record<string, OperationMock>;
  actionMocks: Record<string, OperationMock>;
  assertions: Assertion[];
}

export interface AssertionDefintion extends Assertion {
  id: string;
}
