/* global require */

const { assert, click, createHarness, runScenario } = require('./harness');

function findNode(document, side, path) {
  return Array.from(document.querySelectorAll(`biztalk-schema-tree.${side}-tree .tree-node`)).find((node) => node.dataset.path === path);
}

runScenario('Schema links and functoids render on the canvas', async () => {
  const harness = await createHarness();
  try {
    const { document, map } = harness;
    await harness.waitFor(
      () =>
        !!findNode(document, 'source', '/Root')?.querySelector('.node-connector') &&
        !!findNode(document, 'target', '/Root')?.querySelector('.node-connector')
    );
    const sourceConnector = findNode(document, 'source', '/Root')?.querySelector('.node-connector');
    const targetConnector = findNode(document, 'target', '/Root')?.querySelector('.node-connector');

    click(harness, sourceConnector);
    click(harness, targetConnector);
    await harness.waitFor(() => map.pages[0].links.length === 1 && !!document.querySelector('.mapping-links-overlay [data-link-id]'));
    assert.ok(findNode(document, 'source', '/Root')?.querySelector('.node-connector')?.classList.contains('connected'));
    assert.ok(findNode(document, 'target', '/Root')?.querySelector('.node-connector')?.classList.contains('connected'));

    click(harness, document.querySelector('biztalk-functoid-palette .palette-item'));
    await harness.waitFor(() => map.pages[0].functoids.length === 1 && !!document.querySelector('.functoid-node'));
    const functoidNode = document.querySelector('.functoid-node');
    assert.equal(functoidNode.querySelector('text')?.textContent.trim(), 'Conc');

    functoidNode.dispatchEvent(new harness.dom.window.MouseEvent('dblclick', { bubbles: true }));
    await harness.waitFor(() => !!document.querySelector('.functoid-dialog-tabs'));
    assert.ok(harness.messages.some((message) => message.type === 'update'));
    assert.deepEqual(harness.browserErrors, []);
  } finally {
    harness.close();
  }
});
