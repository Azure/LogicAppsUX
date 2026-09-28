import * as assert from 'assert';
import { selectWorkbenchPromptOption, type WorkbenchPrompt, type WorkbenchPromptContainer } from './workbenchPromptSelection';

const dotnetPrompts: WorkbenchPrompt[] = [
  { matchText: 'Failed to run .NET runtime', optionText: 'Install', postClickDelayMs: 15000 },
  { matchText: '.NET Install Tool', optionText: 'Install', postClickDelayMs: 15000 },
];

const azurePrompts: WorkbenchPrompt[] = [
  { matchText: 'Enable connectors in Azure', optionText: 'Use connectors from Azure' },
  { matchText: 'Enable connectors in Azure', optionText: 'Skip for now' },
];

run();

function run(): void {
  selectsExactInstallButton();
  ignoresInstallTextWithoutNotificationButton();
  ignoresExistingDotnetPathWarningWithoutButton();
  preservesAzureQuickPickRows();
  console.log('[workbenchPromptSelection.unit] all tests passed');
}

function selectsExactInstallButton(): void {
  const result = selectWorkbenchPromptOption(dotnetPrompts, [
    notification('Failed to run .NET runtime. The .NET Install Tool can install the missing runtime.', ['Install']),
  ]);

  assert.strictEqual(result.visible, true);
  assert.strictEqual(result.targetText, 'Install');
  assert.deepStrictEqual(result.point, { x: 10, y: 20 });
  assert.strictEqual(result.postClickDelayMs, 15000);
}

function ignoresInstallTextWithoutNotificationButton(): void {
  const result = selectWorkbenchPromptOption(dotnetPrompts, [
    {
      kind: 'notification',
      text: "Failed to run .NET runtime. 'Install' failed to determine distro. Exit code 127.",
      buttons: [],
      rows: [{ text: 'Failed to determine distro. Install failed. Exit code 127.', point: { x: 10, y: 20 } }],
    },
  ]);

  assert.strictEqual(result.visible, true);
  assert.strictEqual(result.targetText, undefined);
  assert.strictEqual(result.point, undefined);
}

function ignoresExistingDotnetPathWarningWithoutButton(): void {
  const result = selectWorkbenchPromptOption(dotnetPrompts, [
    {
      kind: 'notification',
      text: 'Existing dotnetAcquisitionExtension.existingDotnetPath warning: install path is already configured.',
      buttons: [],
      rows: [{ text: 'existingDotnetPath install warning details', point: { x: 10, y: 20 } }],
    },
  ]);

  assert.strictEqual(result.visible, false);
  assert.strictEqual(result.point, undefined);
}

function preservesAzureQuickPickRows(): void {
  const result = selectWorkbenchPromptOption(azurePrompts, [
    {
      kind: 'quickInput',
      text: 'Enable connectors in Azure',
      buttons: [],
      rows: [
        { text: 'Use connectors from Azure', point: { x: 10, y: 20 } },
        { text: 'Skip for now', point: { x: 30, y: 40 } },
      ],
    },
  ]);

  assert.strictEqual(result.visible, true);
  assert.strictEqual(result.targetText, 'Use connectors from Azure');
  assert.deepStrictEqual(result.point, { x: 10, y: 20 });
}

function notification(text: string, buttons: string[]): WorkbenchPromptContainer {
  return {
    kind: 'notification',
    text,
    buttons: buttons.map((button) => ({ text: button, point: { x: 10, y: 20 } })),
    rows: [],
  };
}
