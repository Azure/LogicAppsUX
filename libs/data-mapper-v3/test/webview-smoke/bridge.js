/* global require, setTimeout */

const { assert, click, createHarness, runScenario } = require('./harness');

runScenario('Toolbar, schema, and palette bridge events work', async () => {
  const harness = await createHarness();
  try {
    const { document, dom, messages } = harness;

    click(harness, document.querySelector('#btn-validate-compile'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(messages.at(-1)?.type, 'compile');

    click(harness, document.querySelector('#btn-test-map'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(messages.at(-1)?.type, 'generateInstance');

    const schemaButtons = document.querySelectorAll('biztalk-schema-tree .schema-edit-btn');
    assert.equal(schemaButtons.length, 2);
    click(harness, schemaButtons[0]);
    assert.equal(messages.at(-1)?.type, 'loadSchema');
    assert.equal(messages.at(-1)?.side, 'source');
    click(harness, schemaButtons[1]);
    assert.equal(messages.at(-1)?.type, 'loadSchema');
    assert.equal(messages.at(-1)?.side, 'target');

    const paletteItem = document.querySelector('biztalk-functoid-palette .palette-item');
    assert.equal(paletteItem.querySelector('.item-name')?.textContent, 'Concatenate');
    assert.equal(dom.window.getComputedStyle(paletteItem).height, '30px');

    const cumulativeCategory = Array.from(document.querySelectorAll('.palette-category')).find(
      (category) => category.querySelector('.category-name')?.textContent === 'Cumulative'
    );
    click(harness, cumulativeCategory.querySelector('.category-header'));
    await harness.waitFor(() => cumulativeCategory.querySelector('.item-name')?.textContent === 'Sum');
    assert.deepEqual(harness.browserErrors, []);
  } finally {
    harness.close();
  }
});
