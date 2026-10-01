/* global __dirname, console, process, require, setTimeout */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

async function waitFor(predicate, timeoutMilliseconds = 1000) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (!predicate()) {
    if (Date.now() >= deadline) {
      throw new Error('Timed out waiting for the webview to render');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function run() {
  const messages = [];
  const browserErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => browserErrors.push(error));

  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="app"></div></body></html>', {
    pretendToBeVisual: true,
    runScripts: 'outside-only',
    url: 'https://webview.test/',
    virtualConsole,
  });

  dom.window.acquireVsCodeApi = () => ({
    postMessage: (message) => messages.push(message),
    getState: () => undefined,
    setState: () => undefined,
  });
  dom.window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  dom.window.PointerEvent = dom.window.MouseEvent;

  const bundle = fs.readFileSync(path.join(__dirname, '..', 'out', 'webview', 'webview.js'), 'utf8');
  dom.window.eval(bundle);
  await new Promise((resolve) => setTimeout(resolve, 25));

  assert.equal(messages[0]?.type, 'ready');
  assert.ok(dom.window.document.querySelector('[data-ui-framework="react"]'));
  assert.ok(dom.window.document.querySelector('[data-fluent-version="9"]'));
  assert.ok(dom.window.document.querySelector('[data-component="mapper-app"]'));

  const schema = {
    filePath: 'schema.xsd',
    rootElement: {
      name: 'Root',
      path: '/Root',
      children: [
        {
          name: 'Value',
          path: '/Root/Value',
          dataType: 'xs:string',
          children: [
            {
              name: 'Inner',
              path: '/Root/Value/Inner',
              dataType: 'xs:string',
              children: [],
              attributes: [
                { name: 'requiredAttribute', type: 'xs:string', required: true },
                { name: 'optionalAttribute', type: 'xs:string', required: false },
              ],
            },
          ],
          attributes: [],
        },
      ],
      attributes: [],
    },
  };
  const map = {
    name: 'Smoke Map',
    sourceSchema: { location: 'source.xsd' },
    targetSchema: { location: 'target.xsd' },
    pages: [{ id: 'page1', name: 'Page 1', links: [], functoids: [] }],
  };

  dom.window.dispatchEvent(
    new dom.window.MessageEvent('message', {
      data: {
        type: 'init',
        data: {
          map,
          sourceSchema: schema,
          targetSchema: schema,
          functoids: [
            {
              id: 107,
              name: 'String Concatenate',
              category: 'String',
              description: 'Concatenates a series of input strings.',
              minInputs: 2,
              maxInputs: 5,
              hasOutput: true,
              tooltip: 'Concatenate values',
            },
          ],
        },
      },
    })
  );
  await waitFor(
    () =>
      dom.window.document.querySelectorAll('.tree-node').length >= 2 &&
      dom.window.document.querySelectorAll('biztalk-schema-tree .schema-edit-btn').length === 2 &&
      !!dom.window.document.querySelector('biztalk-mapping-canvas svg.mapping-svg')
  );

  const document = dom.window.document;
  assert.equal(document.querySelector('.mapper-toolbar')?.getAttribute('role'), 'toolbar');
  assert.equal(document.querySelectorAll('.mapper-toolbar button svg').length, 4);
  assert.equal(document.querySelector('.toolbar-map-name'), null);
  assert.equal(document.querySelector('.mapper-toolbar .page-tabs'), null);
  const pageBar = document.querySelector('.page-sheet-bar');
  assert.ok(pageBar);
  assert.equal(pageBar.parentElement?.classList.contains('canvas-workspace'), true);
  assert.equal(pageBar.previousElementSibling?.classList.contains('canvas-container'), true);
  const contentPanes = Array.from(document.querySelector('.mapper-content').children);
  assert.deepEqual(
    contentPanes.map((pane) => pane.className),
    ['functoid-palette-container', 'mapping-workspace']
  );
  const mappingPanes = Array.from(document.querySelector('.mapping-area').children);
  assert.deepEqual(
    mappingPanes.slice(0, 3).map((pane) => pane.className),
    ['schema-tree-container source-tree', 'canvas-workspace', 'schema-tree-container target-tree']
  );
  assert.deepEqual(
    Array.from(document.querySelector('.canvas-workspace').children).map((pane) => pane.className),
    ['canvas-container', 'page-sheet-bar']
  );
  assert.ok(mappingPanes[3].classList.contains('mapping-links-overlay'));

  const paletteItem = document.querySelector('biztalk-functoid-palette .palette-item');
  const paletteItemContent = paletteItem.querySelector('.palette-item-content');
  const paletteIcon = paletteItem.querySelector('.item-icon');
  const paletteItemName = paletteItem.querySelector('.item-name');
  assert.equal(dom.window.getComputedStyle(paletteItem).height, '30px');
  assert.equal(dom.window.getComputedStyle(paletteItemName).fontSize, '13px');
  assert.equal(dom.window.getComputedStyle(paletteItemContent).justifyContent, 'flex-start');
  assert.equal(dom.window.getComputedStyle(paletteIcon).width, '17px');
  assert.equal(dom.window.getComputedStyle(paletteIcon).height, '17px');
  assert.equal(document.querySelectorAll('biztalk-schema-tree').length, 2);
  assert.ok(document.querySelectorAll('.tree-node').length >= 2);
  assert.ok(document.querySelector('biztalk-functoid-palette .palette-item'));
  assert.ok(document.querySelector('biztalk-mapping-canvas svg.mapping-svg'));
  const targetRootNode = document.querySelector('biztalk-schema-tree.target-tree .tree-node');
  assert.ok(targetRootNode.firstElementChild.classList.contains('tree-indent'));
  assert.equal(dom.window.getComputedStyle(targetRootNode).textAlign, 'left');
  assert.equal(dom.window.getComputedStyle(targetRootNode).direction, 'ltr');

  const schemaEditButtons = document.querySelectorAll('biztalk-schema-tree .schema-edit-btn');
  assert.equal(schemaEditButtons.length, 2);
  schemaEditButtons[0].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(messages.at(-1).type, 'loadSchema');
  assert.equal(messages.at(-1).side, 'source');
  schemaEditButtons[1].dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(messages.at(-1).type, 'loadSchema');
  assert.equal(messages.at(-1).side, 'target');

  const attributeOnlyNode = Array.from(document.querySelectorAll('biztalk-schema-tree.source-tree .tree-node')).find(
    (node) => node.dataset.path === '/Root/Value/Inner'
  );
  attributeOnlyNode.querySelector('.tree-icon').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  const requiredAttribute = document.querySelector('.tree-node[data-path="/Root/Value/Inner/@requiredAttribute"]');
  const optionalAttribute = document.querySelector('.tree-node[data-path="/Root/Value/Inner/@optionalAttribute"]');
  assert.ok(requiredAttribute);
  assert.ok(optionalAttribute);
  assert.equal(requiredAttribute.querySelector('.node-name').textContent, 'requiredAttribute');
  assert.equal(optionalAttribute.querySelector('.node-name').textContent, 'optionalAttribute');
  assert.equal(requiredAttribute.querySelector('.tree-icon'), null);
  assert.ok(requiredAttribute.querySelector('.attribute-icon svg'));
  assert.ok(requiredAttribute.querySelector('.node-badge.required'));
  assert.equal(optionalAttribute.querySelector('.node-badge.required'), null);
  assert.equal(dom.window.getComputedStyle(requiredAttribute.querySelector('.node-data-type')).display, 'none');

  document.querySelector('#btn-copilot').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  const copilotPrompt = document.querySelector('#copilot-prompt');
  assert.ok(copilotPrompt);
  assert.equal(copilotPrompt.value, 'Take the XSLT file and generate the map.');
  document.querySelector('#copilot-add-context').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(messages.at(-1).type, 'browseCopilotContext');
  dom.window.dispatchEvent(
    new dom.window.MessageEvent('message', {
      data: {
        type: 'copilotContextChanged',
        data: {
          files: [{ id: 'file:///sample.xslt', name: 'sample.xslt', size: 2048 }],
        },
      },
    })
  );
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(document.querySelector('.copilot-context-file span').textContent, 'sample.xslt');
  document.querySelector('.copilot-remove-context').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(messages.at(-1).type, 'removeCopilotContext');
  assert.equal(messages.at(-1).data.id, 'file:///sample.xslt');
  copilotPrompt.value = 'Rename this map to Copilot Map';
  copilotPrompt.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  copilotPrompt.dispatchEvent(
    new dom.window.KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
      bubbles: true,
    })
  );
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(
    JSON.stringify(messages.at(-1)),
    JSON.stringify({
      type: 'copilotPrompt',
      data: { prompt: 'Rename this map to Copilot Map', activePage: 0 },
    })
  );
  dom.window.dispatchEvent(
    new dom.window.MessageEvent('message', {
      data: {
        type: 'copilotResult',
        data: {
          success: true,
          applied: true,
          message: 'Renamed the map',
          map: { ...map, name: 'Copilot Map' },
        },
      },
    })
  );
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(document.querySelector('.toolbar-map-name'), null);
  assert.match(document.querySelector('.copilot-result')?.textContent, /Renamed the map/);

  document.querySelector('.page-tab').dispatchEvent(new dom.window.MouseEvent('dblclick', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  const pageNameInput = document.querySelector('.page-name-input');
  assert.ok(pageNameInput);
  pageNameInput.value = 'Main Mapping';
  pageNameInput.dispatchEvent(
    new dom.window.KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
    })
  );
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(map.pages[0].name, 'Main Mapping');
  assert.equal(document.querySelector('.page-tab').textContent.trim(), 'Main Mapping');
  assert.equal(document.querySelector('.page-delete-btn').disabled, true);

  document.querySelector('#btn-add-page').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(map.pages.length, 2);
  document.querySelector('.page-delete-btn[data-page="1"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(map.pages.length, 1);
  assert.equal(map.pages[0].name, 'Main Mapping');

  const sourceInnerNode = Array.from(document.querySelectorAll('biztalk-schema-tree.source-tree .tree-node')).find(
    (node) => node.dataset.path === '/Root/Value/Inner'
  );
  sourceInnerNode.dispatchEvent(new dom.window.MouseEvent('dblclick', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(document.querySelector('.schema-properties-panel .schema-property-name').textContent, 'Inner');
  assert.equal(document.querySelector('.schema-property-xpath').textContent.trim(), '/Root/Value/Inner');
  assert.match(document.querySelector('.schema-property-list').textContent, /Data type\s*xs:string/);
  document.querySelector('#schema-properties-close').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));

  const sourceTree = document.querySelector('biztalk-schema-tree.source-tree');
  const targetSchemaTree = document.querySelector('biztalk-schema-tree.target-tree');
  assert.equal(sourceTree.querySelector('.schema-title').textContent, 'Source Schema');
  assert.equal(targetSchemaTree.querySelector('.schema-title').textContent, 'Target Schema');
  assert.equal(sourceTree.querySelectorAll('.schema-expand-collapse-btn').length, 1);
  assert.equal(targetSchemaTree.querySelectorAll('.schema-expand-collapse-btn').length, 1);
  assert.equal(dom.window.getComputedStyle(sourceTree.querySelector('.schema-actions')).marginLeft, 'auto');

  sourceTree.querySelector('button[title="Expand All"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(document.querySelectorAll('.tree-node').length, 8);

  sourceTree.querySelector('button[title="Collapse All"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(document.querySelectorAll('.tree-node').length, 5);

  sourceTree.querySelector('button[title="Expand All"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(document.querySelectorAll('.tree-node').length, 8);

  const categoryHeader = document.querySelector('biztalk-functoid-palette .category-header');
  categoryHeader.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(document.querySelectorAll('biztalk-functoid-palette .palette-item').length, 0);
  categoryHeader.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));

  const sourceConnector = Array.from(document.querySelectorAll('biztalk-schema-tree.source-tree .tree-node'))
    .find((node) => node.dataset.path === '/Root/Value/Inner')
    ?.querySelector('.node-connector');
  const targetConnector = Array.from(document.querySelectorAll('biztalk-schema-tree.target-tree .tree-node'))
    .find((node) => node.dataset.path === '/Root/Value/Inner')
    ?.querySelector('.node-connector');
  sourceConnector.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  targetConnector.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(map.pages[0].links.length, 1);
  assert.ok(document.querySelector('.mapping-links-overlay [data-link-id]'));

  const linkedSourceParent = Array.from(document.querySelectorAll('biztalk-schema-tree.source-tree .tree-node')).find(
    (node) => node.dataset.path === '/Root/Value'
  );
  linkedSourceParent.querySelector('.tree-icon').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.ok(document.querySelector('.mapping-links-overlay [data-link-id]'));
  assert.deepEqual(sourceTree.getNodePosition('/Root/Value/Inner'), sourceTree.getNodePosition('/Root/Value'));
  linkedSourceParent.querySelector('.tree-icon').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.ok(document.querySelector('.mapping-links-overlay [data-link-id]'));

  const targetTree = document.querySelector('biztalk-schema-tree.target-tree');
  const linkedTargetParent = Array.from(targetTree.querySelectorAll('.tree-node')).find((node) => node.dataset.path === '/Root/Value');
  linkedTargetParent.querySelector('.tree-icon').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.ok(document.querySelector('.mapping-links-overlay [data-link-id]'));
  assert.deepEqual(targetTree.getNodePosition('/Root/Value/Inner'), targetTree.getNodePosition('/Root/Value'));
  linkedTargetParent.querySelector('.tree-icon').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.ok(document.querySelector('.mapping-links-overlay [data-link-id]'));

  document.querySelector('.mapping-links-overlay [data-link-id] path').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(document.querySelector('.mapping-links-overlay [data-link-id] .mapping-link').getAttribute('stroke'), '#007fd4');

  document.querySelector('biztalk-functoid-palette .palette-item').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));

  assert.equal(map.pages[0].functoids.length, 1);
  const canvas = document.querySelector('biztalk-mapping-canvas');
  assert.ok(canvas.querySelector('.functoid-node'));
  canvas.querySelector('.functoid-node text').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(canvas.querySelector('.functoid-node .functoid-body').tagName.toLowerCase(), 'circle');
  assert.equal(canvas.querySelector('.functoid-node .functoid-body').getAttribute('stroke'), '#007fd4');

  const currentSourceConnector = Array.from(document.querySelectorAll('biztalk-schema-tree.source-tree .tree-node'))
    .find((node) => node.dataset.path === '/Root/Value/Inner')
    ?.querySelector('.node-connector');
  const currentTargetConnector = Array.from(document.querySelectorAll('biztalk-schema-tree.target-tree .tree-node'))
    .find((node) => node.dataset.path === '/Root/Value/Inner')
    ?.querySelector('.node-connector');
  const functoidInput = canvas.querySelector('.functoid-node .input-connector');
  const functoidOutput = canvas.querySelector('.functoid-node .output-connector');

  currentSourceConnector.dispatchEvent(new dom.window.MouseEvent('pointerdown', { bubbles: true, buttons: 1 }));
  document.dispatchEvent(new dom.window.MouseEvent('pointermove', { bubbles: true, buttons: 1, clientX: 300, clientY: 200 }));
  assert.equal(map.pages[0].links.length, 1);
  await waitFor(() => !!document.querySelector('.mapping-link-preview'));
  functoidInput.dispatchEvent(new dom.window.MouseEvent('pointerup', { bubbles: true }));
  assert.equal(document.querySelector('.mapping-link-preview'), null);
  functoidOutput.dispatchEvent(new dom.window.MouseEvent('pointerdown', { bubbles: true, buttons: 1 }));
  assert.equal(map.pages[0].links.length, 2);
  currentTargetConnector.dispatchEvent(new dom.window.MouseEvent('pointerup', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));

  assert.equal(map.pages[0].links.length, 3);
  assert.equal(map.pages[0].links[1].targetType, 'functoid');
  assert.equal(map.pages[0].links[2].sourceType, 'functoid');
  map.pages[0].links.splice(1, 2);

  const zoomIn = canvas.querySelector('button[title="Zoom In"]');
  zoomIn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(canvas.querySelector('[data-zoom]')?.textContent, '110%');
  assert.match(canvas.querySelector('.functoid-node').getAttribute('transform'), /scale\(1\.1\)/);

  const pathBeforeScroll = document.querySelector('.mapping-links-overlay [data-link-id] path').getAttribute('d');
  canvas.scrollLeft = 20;
  canvas.scrollTop = 10;
  canvas.dispatchEvent(new dom.window.Event('scroll'));
  await new Promise((resolve) => setTimeout(resolve, 25));
  const pathAfterScroll = document.querySelector('.mapping-links-overlay [data-link-id] path').getAttribute('d');
  assert.equal(pathAfterScroll, pathBeforeScroll);

  const droppedFunctoid = {
    id: 107,
    name: 'String Concatenate',
    category: 'String',
  };
  const dropEvent = new dom.window.Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperties(dropEvent, {
    clientX: { value: 110 },
    clientY: { value: 66 },
    dataTransfer: {
      value: {
        getData: (type) => (type === 'functoid' ? JSON.stringify(droppedFunctoid) : ''),
        dropEffect: 'copy',
      },
    },
  });
  canvas.querySelector('svg.mapping-svg').dispatchEvent(dropEvent);
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(map.pages[0].functoids.length, 2);
  assert.ok(Math.abs(map.pages[0].functoids[1].x - 130 / 1.1) < 0.001);
  assert.ok(Math.abs(map.pages[0].functoids[1].y - 76 / 1.1) < 0.001);

  const initialX = map.pages[0].functoids[0].x;
  const initialY = map.pages[0].functoids[0].y;
  canvas
    .querySelector('.functoid-node text')
    .dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true, clientX: 100, clientY: 100 }));
  canvas
    .querySelector('svg.mapping-svg')
    .dispatchEvent(new dom.window.MouseEvent('mousemove', { bubbles: true, clientX: 155, clientY: 144 }));
  canvas
    .querySelector('svg.mapping-svg')
    .dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true, clientX: 155, clientY: 144 }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.ok(Math.abs(map.pages[0].functoids[0].x - initialX - 50) < 0.001);
  assert.ok(Math.abs(map.pages[0].functoids[0].y - initialY - 40) < 0.001);

  const edgeDragStartX = map.pages[0].functoids[0].x;
  const edgeDragStartY = map.pages[0].functoids[0].y;
  canvas
    .querySelector('.functoid-node .functoid-body')
    .dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true, clientX: 132, clientY: 100 }));
  canvas
    .querySelector('svg.mapping-svg')
    .dispatchEvent(new dom.window.MouseEvent('mousemove', { bubbles: true, clientX: 154, clientY: 133 }));
  canvas
    .querySelector('svg.mapping-svg')
    .dispatchEvent(new dom.window.MouseEvent('mouseup', { bubbles: true, clientX: 154, clientY: 133 }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.ok(Math.abs(map.pages[0].functoids[0].x - edgeDragStartX - 20) < 0.001);
  assert.ok(Math.abs(map.pages[0].functoids[0].y - edgeDragStartY - 30) < 0.001);

  const editableFunctoid = map.pages[0].functoids[0];
  map.pages[0].links.push(
    {
      id: 'functoid-input-1',
      sourceId: '/Root/Value',
      sourcePath: '/Root/Value',
      targetId: editableFunctoid.id,
      sourceType: 'schemaNode',
      targetType: 'functoid',
    },
    {
      id: 'functoid-input-2',
      sourceId: '/Root/Value/Inner',
      sourcePath: '/Root/Value/Inner',
      targetId: editableFunctoid.id,
      sourceType: 'schemaNode',
      targetType: 'functoid',
    }
  );
  editableFunctoid.inputLinks = ['functoid-input-1', 'functoid-input-2'];
  editableFunctoid.parameters = [{ index: 1, type: 'constant', value: '-middle-' }];
  canvas.querySelector('.functoid-node').dispatchEvent(new dom.window.MouseEvent('dblclick', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(document.querySelector('.config-title').textContent, 'Configure String Concatenate');
  assert.equal(dom.window.getComputedStyle(document.querySelector('.functoid-properties-panel > .config-actions')).paddingBottom, '18px');
  assert.deepEqual(
    Array.from(document.querySelectorAll('.functoid-dialog-tab')).map((tab) => tab.textContent),
    ['Functoid Inputs', 'Output', 'Label and Comments']
  );
  assert.match(document.querySelector('.functoid-input-validation').textContent, /Configured 3; expected 2 to 5 inputs/);
  assert.equal(document.querySelectorAll('.functoid-input-row').length, 3);
  assert.equal(document.querySelectorAll('.functoid-default-input').length, 3);

  document.querySelector('[data-functoid-tab="output"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  assert.equal(document.querySelector('[data-functoid-panel="output"]').hidden, false);
  document.querySelector('[data-functoid-tab="label"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const functoidLabel = document.querySelector('#properties-label');
  const functoidComments = document.querySelector('#properties-comments');
  functoidLabel.value = 'Customer display name';
  functoidLabel.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  functoidComments.value = 'Combines customer name segments.';
  functoidComments.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  document.querySelector('[data-functoid-tab="inputs"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  document.querySelector('#properties-add-input').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(document.querySelectorAll('.functoid-input-row').length, 4);
  document
    .querySelector('[data-input-action="remove"][data-index="3"]')
    .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  assert.equal(document.querySelectorAll('.functoid-input-row').length, 3);

  document.querySelector('[data-input-action="down"][data-index="0"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  document.querySelector('[data-input-action="up"][data-index="2"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  const defaultInputs = document.querySelectorAll('.functoid-default-input');
  const defaultInput = defaultInputs[1];
  defaultInput.value = '-suffix';
  defaultInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  document.querySelector('#properties-save').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 25));

  assert.deepEqual(JSON.parse(JSON.stringify(editableFunctoid.parameters.map((parameter) => [parameter.type, parameter.value]))), [
    ['constant', '-middle-'],
    ['link', 'functoid-input-2'],
    ['link', 'functoid-input-1'],
  ]);
  assert.equal(editableFunctoid.parameters[1].defaultValue, '-suffix');
  assert.deepEqual(JSON.parse(JSON.stringify(editableFunctoid.inputLinks)), ['functoid-input-2', 'functoid-input-1']);
  assert.equal(editableFunctoid.label, 'Customer display name');
  assert.equal(editableFunctoid.comments, 'Combines customer name segments.');

  const currentCanvas = document.querySelector('biztalk-mapping-canvas');
  for (let index = 0; index < 15; index++) {
    currentCanvas.querySelector('button[title="Zoom Out"]').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  assert.equal(currentCanvas.querySelector('[data-zoom]')?.textContent, '10%');
  assert.equal(currentCanvas.querySelector('button[title="Zoom Out"]').disabled, true);

  assert.ok(messages.some((message) => message.type === 'update'));
  assert.deepEqual(browserErrors, []);

  dom.window.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
