/* global require */

const { assert, createHarness, runScenario } = require('./harness');

runScenario('React shell mounts with stable layout', async () => {
  const harness = await createHarness();
  try {
    const { document } = harness;
    assert.ok(document.querySelector('[data-ui-framework="react"]'));
    assert.ok(document.querySelector('[data-fluent-version="9"]'));
    assert.equal(document.querySelector('.mapper-toolbar')?.getAttribute('role'), 'toolbar');

    assert.deepEqual(
      Array.from(document.querySelector('.mapper-content').children).map((pane) => pane.className),
      ['functoid-palette-container', 'mapping-workspace']
    );
    assert.deepEqual(
      Array.from(document.querySelector('.mapping-area').children)
        .slice(0, 3)
        .map((pane) => pane.className),
      ['schema-tree-container source-tree', 'canvas-workspace', 'schema-tree-container target-tree']
    );
    assert.deepEqual(
      Array.from(document.querySelector('.canvas-workspace').children).map((pane) => pane.className),
      ['canvas-container', 'page-sheet-bar']
    );
    assert.ok(document.querySelector('.mapping-links-overlay'));
    assert.equal(document.querySelectorAll('biztalk-schema-tree').length, 2);
    assert.deepEqual(harness.browserErrors, []);
  } finally {
    harness.close();
  }
});
