/* global require */

const { assert, click, createHarness, runScenario } = require('./harness');

runScenario('Page and Copilot shell state updates', async () => {
  const harness = await createHarness();
  try {
    const { document, dom, map, messages } = harness;

    await harness.waitFor(() => !!document.querySelector('.page-tab'));
    document.querySelector('.page-tab').dispatchEvent(new dom.window.MouseEvent('dblclick', { bubbles: true }));
    await harness.waitFor(() => !!document.querySelector('.page-name-input'));
    const pageNameInput = document.querySelector('.page-name-input');
    pageNameInput.value = 'Main Mapping';
    pageNameInput.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await harness.waitFor(() => map.pages[0].name === 'Main Mapping');
    assert.equal(document.querySelector('.page-tab')?.textContent.trim(), 'Main Mapping');

    click(harness, document.querySelector('#btn-add-page'));
    await harness.waitFor(() => map.pages.length === 2);
    click(harness, document.querySelector('.page-delete-btn[data-page="1"]'));
    await harness.waitFor(() => map.pages.length === 1);

    click(harness, document.querySelector('#btn-copilot'));
    await harness.waitFor(() => !!document.querySelector('#copilot-prompt'));
    click(harness, document.querySelector('#copilot-add-context'));
    assert.equal(messages.at(-1)?.type, 'browseCopilotContext');

    dom.window.dispatchEvent(
      new dom.window.MessageEvent('message', {
        data: {
          type: 'copilotContextChanged',
          data: { files: [{ id: 'file:///sample.xslt', name: 'sample.xslt', size: 2048 }] },
        },
      })
    );
    await harness.waitFor(() => document.querySelector('.copilot-context-file span')?.textContent === 'sample.xslt');

    const prompt = document.querySelector('#copilot-prompt');
    prompt.value = 'Rename this map to Copilot Map';
    const applyButton = Array.from(document.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Apply with Assistant')
    );
    click(harness, applyButton);
    await harness.waitFor(() => messages.at(-1)?.type === 'copilotPrompt');
    assert.equal(messages.at(-1)?.data.prompt, 'Rename this map to Copilot Map');
    assert.equal(messages.at(-1)?.data.activePage, 0);
    assert.deepEqual(harness.browserErrors, []);
  } finally {
    harness.close();
  }
});
