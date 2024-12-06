export interface AssertionResults {
  Status: boolean;
  AssertionString: string;
  Description?: string;
  Name?: string;
}

export interface UnitTestResult {
  Results: {
    AssertionResults: AssertionResults[];
    OverallStatus: boolean;
  };
}

export interface UnitTestExecutionResult {
  isSuccessful: boolean;
  duration?: number;
}
