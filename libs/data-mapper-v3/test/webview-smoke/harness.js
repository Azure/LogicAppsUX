/* global __dirname, module, process, require, setTimeout */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const bundle = fs.readFileSync(path.join(__dirname, '..', '..', 'out', 'webview', 'webview.js'), 'utf8');

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

const functoids = [
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
  {
    id: 324,
    name: 'Cumulative Sum',
    category: 'Cumulative',
    description: 'Adds values across repeating records.',
    minInputs: 1,
    maxInputs: 1,
    hasOutput: true,
    tooltip: 'Sum repeating values',
  },
];

function createMap() {
  return {
    name: 'Smoke Map',
    sourceSchema: { location: 'source.xsd' },
    targetSchema: { location: 'target.xsd' },
    pages: [{ id: 'page1', name: 'Page 1', links: [], functoids: [] }],
  };
}

async function waitFor(predicate, timeoutMilliseconds = 2000) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (!predicate()) {
    if (Date.now() >= deadline) {
      throw new Error('Timed out waiting for the webview to render');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function createHarness() {
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
  dom.window.eval(bundle);

  await waitFor(() => messages[0]?.type === 'ready' && !!dom.window.document.querySelector('[data-component="mapper-app"]'));

  const map = createMap();
  dom.window.dispatchEvent(
    new dom.window.MessageEvent('message', {
      data: {
        type: 'init',
        data: {
          map,
          sourceSchema: schema,
          targetSchema: schema,
          availableSchemas: ['existing.xsd'],
          functoids,
        },
      },
    })
  );

  await waitFor(
    () =>
      dom.window.document.querySelectorAll('.tree-node').length >= 2 &&
      !!dom.window.document.querySelector('biztalk-functoid-palette .palette-item') &&
      !!dom.window.document.querySelector('biztalk-mapping-canvas svg.mapping-svg')
  );

  return {
    dom,
    document: dom.window.document,
    messages,
    browserErrors,
    map,
    waitFor,
    close() {
      dom.window.close();
    },
  };
}

function click(harness, element) {
  assert.ok(element);
  element.dispatchEvent(new harness.dom.window.MouseEvent('click', { bubbles: true }));
}

function runScenario(name, scenario) {
  scenario().then(
    () => {
      process.stdout.write(`PASS ${name}\n`);
      process.exit(0);
    },
    (error) => {
      process.stderr.write(`${error.stack || error}\n`);
      process.exit(1);
    }
  );
}

module.exports = { assert, click, createHarness, runScenario };
