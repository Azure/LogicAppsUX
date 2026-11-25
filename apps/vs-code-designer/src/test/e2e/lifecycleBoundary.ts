import * as vscode from 'vscode';

let observer: { shutdown(): Promise<void>; receipt?: string } | undefined;
suiteSetup(async function () {
  this.timeout(120_000);
  // The supported fixture's activation context supplies the current host log
  // URI. Test code must never guess it from the profile's historical sessions.
  const recorder = vscode.extensions.getExtension<{ shutdown(): Promise<void>; receipt?: string }>(
    'logic-apps-tests.logic-apps-lifecycle-test-recorder'
  );
  if (!process.env.LA_E2E_LIFECYCLE_DIR) {
    return;
  }
  if (!recorder) {
    throw new Error('Current-host lifecycle recorder extension unavailable');
  }
  observer = await recorder.activate();
});
suiteTeardown(async function () {
  this.timeout(30_000);
  await observer?.shutdown();
});
