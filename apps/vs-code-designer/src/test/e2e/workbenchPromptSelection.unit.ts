import * as assert from 'assert';
import {
  affirmativeAzureConnectorPrompt,
  selectWorkbenchPromptOption,
  type WorkbenchPrompt,
  type WorkbenchPromptContainer,
} from './workbenchPromptSelection';

const dotnetPrompts: WorkbenchPrompt[] = [
  { matchText: 'Failed to run .NET runtime', optionText: 'Install', postClickDelayMs: 15000 },
  { matchText: '.NET Install Tool', optionText: 'Install', postClickDelayMs: 15000 },
];

const azurePrompts: WorkbenchPrompt[] = [affirmativeAzureConnectorPrompt];

run();

function run(): void {
  selectsExactInstallButton();
  ignoresInstallTextWithoutNotificationButton();
  ignoresExistingDotnetPathWarningWithoutButton();
  preservesAzureQuickPickRows();
  selectsOnlyAffirmativeAzureOptions();
  selectsRealCancelWithoutNoOrEscapeFallback();
  console.log('[workbenchPromptSelection.unit] all tests passed');
}

function selectsOnlyAffirmativeAzureOptions(): void {
  const prompt = [affirmativeAzureConnectorPrompt];
  for (const kind of ['quickInput', 'dialog', 'notification'] as const) {
    const affirmative = { text: 'Yes', point: { x: 10, y: 20 } };
    const container: WorkbenchPromptContainer = {
      kind,
      text: 'Enable connectors in Azure',
      rows: kind === 'quickInput' ? [affirmative, { text: 'Skip for now', point: { x: 30, y: 40 } }] : [],
      buttons: kind === 'quickInput' ? [] : [{ text: 'No', point: { x: 30, y: 40 } }, affirmative],
    };
    assert.strictEqual(selectWorkbenchPromptOption(prompt, [container]).targetText, 'Yes');
  }
  for (const text of ['Skip for now', 'No', 'Cancel', 'Not Yes', 'Yesterday']) {
    const rejected: WorkbenchPromptContainer = {
      kind: 'quickInput',
      text: 'Enable connectors in Azure',
      buttons: [{ text, point: { x: 1, y: 2 } }],
      rows: [{ text, point: { x: 1, y: 2 } }],
    };
    assert.strictEqual(
      selectWorkbenchPromptOption(prompt, [rejected]).point,
      undefined,
      'Azure setup must never fall back to a negative option'
    );
  }
  const disabled: WorkbenchPromptContainer = {
    kind: 'quickInput',
    text: 'Enable connectors in Azure',
    rows: [{ text: 'Use connectors from Azure' }, { text: 'Skip for now', point: { x: 1, y: 2 } }],
    buttons: [],
  };
  assert.strictEqual(selectWorkbenchPromptOption(prompt, [disabled]).point, undefined);
  assert.strictEqual(
    selectWorkbenchPromptOption(prompt, [
      { ...disabled, text: 'Do you want to open this workspace now?', buttons: [{ text: 'Yes', point: { x: 1, y: 2 } }] },
    ]).visible,
    false,
    'The Azure policy must not change an unrelated workspace dialog'
  );
}
function selectsRealCancelWithoutNoOrEscapeFallback(): void {
  const prompts = [{ matchText: 'Do you want to open this workspace now?', optionText: 'Cancel' }];
  const text = 'You must open your workspace. Do you want to open this workspace now?';
  assert.strictEqual(
    selectWorkbenchPromptOption(prompts, [{ kind: 'dialog', text, buttons: [{ text: 'No', point: { x: 1, y: 2 } }], rows: [] }]).point,
    undefined
  );
  assert.strictEqual(
    selectWorkbenchPromptOption(prompts, [{ kind: 'dialog', text, buttons: [{ text: 'Cancel' }], rows: [] }]).point,
    undefined
  );
  assert.deepStrictEqual(
    selectWorkbenchPromptOption(prompts, [{ kind: 'dialog', text, buttons: [{ text: 'Cancel', point: { x: 10, y: 20 } }], rows: [] }])
      .point,
    { x: 10, y: 20 }
  );
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
