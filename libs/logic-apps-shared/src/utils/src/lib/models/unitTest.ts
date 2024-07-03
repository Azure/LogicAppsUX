export interface OperationMock {
  properties: {
    status: string;
    errorCode?: string; // Adding optional errorCode property
    errorMessage?: string; // Adding optional errorMessage property
  };
  [key: string]: any;
}

export interface Assertion {
  name: string;
  description: string;
  assertionString: string;
}

export interface UnitTestDefinition {
  triggerMocks: Record<string, OperationMock>;
  actionMocks: Record<string, OperationMock>;
  assertions: Assertion[];
}

export interface AssertionDefinition extends Assertion {
  id: string;
  isEditable: boolean;
}
