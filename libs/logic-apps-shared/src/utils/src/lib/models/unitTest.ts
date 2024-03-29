export interface OperationMock {
  outputs?: Record<string, any>;
  properties?: {
    status: string;
  };
}

export interface Assertion {
  name: string;
  description: string;
  expression: Record<string, any>;
}

export interface UnitTestDefinition {
  triggerMocks: Record<string, OperationMock>;
  actionMocks: Record<string, OperationMock>;
  assertions: Assertion[];
}

export interface AssertionDefintion extends Assertion {
  id: string;
  isEditable: boolean;
}
