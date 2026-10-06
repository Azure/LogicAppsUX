export function observeMsnCleanupDiagnostics(options: {
  dependencyRoot: string;
  outputDir: string;
  stage: 'before-task-teardown' | 'after-task-teardown' | 'after-cli-close';
}): Promise<unknown>;
export function recordMsnBodyAssertions(options: { outputDir: string; invocation: string }): void;
