import { describe, test, expect } from 'vitest';
import {
  createInitialMapperViewState,
  HOST_TO_WEBVIEW_MESSAGE_TYPES,
  isHostToWebviewMessage,
  isWebviewToHostMessage,
  WEBVIEW_TO_HOST_MESSAGE_TYPES,
} from '../src/protocol/mapEditorProtocol';

describe('Map Editor protocol', () => {
  test('freezes the webview-to-host command names', () => {
    expect(WEBVIEW_TO_HOST_MESSAGE_TYPES).toEqual([
      'ready',
      'copyText',
      'update',
      'compile',
      'loadSchema',
      'selectSchemaRoot',
      'testMap',
      'generateInstance',
      'testMapWithInput',
      'browseAssembly',
      'exportXslt',
      'deployToLogicApps',
      'copilotPrompt',
      'browseCopilotContext',
      'removeCopilotContext',
      'clearCopilotContext',
    ]);
  });

  test('freezes the host-to-webview event names', () => {
    expect(HOST_TO_WEBVIEW_MESSAGE_TYPES).toEqual([
      'init',
      'executeCompile',
      'executeTestMap',
      'documentChanged',
      'schemaLoaded',
      'schemaStateChanged',
      'compileResult',
      'assemblySelected',
      'instanceGenerated',
      'testMapResult',
      'copilotResult',
      'copilotContextChanged',
    ]);
  });

  test.each([
    { type: 'ready' },
    { type: 'loadSchema', side: 'source', browse: true },
    { type: 'loadSchema', side: 'target', path: 'Customer.xsd' },
    { type: 'generateInstance', side: 'target' },
    { type: 'testMapWithInput', data: { inputXml: '<Root/>', map: {} } },
    { type: 'compile', data: {} },
    { type: 'copilotPrompt', data: { prompt: 'Rename this page', activePage: 0 } },
    { type: 'browseCopilotContext' },
    { type: 'removeCopilotContext', data: { id: 'file:///requirements.txt' } },
    { type: 'clearCopilotContext' },
  ])('accepts valid webview command $type', (message) => {
    expect(isWebviewToHostMessage(message)).toBe(true);
  });

  test.each([
    null,
    {},
    { type: 'unknown' },
    { type: 'loadSchema', side: 'left' },
    { type: 'compile' },
    { type: 'copilotPrompt', data: { prompt: 1, activePage: '0' } },
    { type: 'testMapWithInput', data: { inputXml: 1, map: {} } },
  ])('rejects an invalid webview command', (message) => {
    expect(isWebviewToHostMessage(message)).toBe(false);
  });

  test.each([
    {
      type: 'init',
      data: { map: {}, sourceSchema: null, targetSchema: null, availableSchemas: [], functoids: [] },
    },
    {
      type: 'schemaStateChanged',
      data: { map: {}, sourceSchema: null, targetSchema: {}, availableSchemas: ['Customer.xsd'] },
    },
    {
      type: 'schemaLoaded',
      data: { side: 'source', schema: {}, path: 'source.xsd' },
    },
    {
      type: 'compileResult',
      data: { success: true, errors: [], warnings: [] },
    },
    {
      type: 'assemblySelected',
      data: { path: 'functions.dll', classes: [] },
    },
    {
      type: 'instanceGenerated',
      data: { side: 'source', xml: '<Root/>' },
    },
    {
      type: 'testMapResult',
      data: { output: '<Result/>' },
    },
    {
      type: 'copilotResult',
      data: { success: true, applied: false, message: 'Cancelled' },
    },
    {
      type: 'copilotContextChanged',
      data: { files: [{ id: 'file:///sample.xslt', name: 'sample.xslt', size: 42 }] },
    },
  ])('accepts valid host event $type', (message) => {
    expect(isHostToWebviewMessage(message)).toBe(true);
  });

  test.each([
    null,
    {},
    { type: 'unknown', data: {} },
    { type: 'schemaLoaded', data: { side: 'left', schema: {}, path: '' } },
    { type: 'compileResult', data: { success: true } },
    { type: 'instanceGenerated', data: { side: 'source' } },
    { type: 'copilotResult', data: { success: true, message: 'Missing applied' } },
    { type: 'testMapResult', data: { output: 1 } },
  ])('rejects an invalid host event', (message) => {
    expect(isHostToWebviewMessage(message)).toBe(false);
  });

  for (const [direction, validate] of [
    ['webview command', isWebviewToHostMessage],
    ['host event', isHostToWebviewMessage],
  ] as const) {
    test.each([undefined, null, false, 0, 'message', [], {}, { type: 42 }, { type: null }])(
      `rejects malformed ${direction} envelope: %j`,
      (message) => {
        expect(validate(message)).toBe(false);
      }
    );
  }

  describe('extension-side command validation boundaries', () => {
    test.each(['testMap', 'browseAssembly'])('accepts payload-free command %s', (type) => {
      expect(isWebviewToHostMessage({ type })).toBe(true);
    });

    for (const type of ['update', 'compile', 'exportXslt', 'deployToLogicApps']) {
      test.each([{}, []])(`accepts object data for ${type} without deep model validation: %j`, (data) => {
        expect(isWebviewToHostMessage({ type, data })).toBe(true);
      });
      test.each([undefined, null, false, 42, 'map'])(`rejects non-object data for ${type}: %j`, (data) => {
        expect(isWebviewToHostMessage({ type, data })).toBe(false);
      });
    }

    test.each([
      { type: 'loadSchema', side: 'source' },
      { type: 'loadSchema', side: 'target', path: '', browse: false },
      { type: 'loadSchema', side: 'source', path: 'Schemas/Order.xsd', browse: true },
      { type: 'selectSchemaRoot', side: 'source', rootName: 'Order' },
      { type: 'selectSchemaRoot', side: 'target', rootName: 'Invoice' },
      { type: 'generateInstance', side: 'source' },
      { type: 'copilotPrompt', data: { prompt: '', activePage: 0 } },
      { type: 'removeCopilotContext', data: { id: '' } },
      { type: 'testMapWithInput', data: { inputXml: '', map: {} } },
    ])('accepts typed command fields without business validation: %j', (message) => {
      expect(isWebviewToHostMessage(message)).toBe(true);
    });

    test.each([
      ['missing schema side', { type: 'loadSchema' }],
      ['non-string schema path', { type: 'loadSchema', side: 'source', path: 42 }],
      ['null schema path', { type: 'loadSchema', side: 'source', path: null }],
      ['non-boolean browse', { type: 'loadSchema', side: 'target', path: 'Invoice.xsd', browse: 'true' }],
      ['invalid root side', { type: 'selectSchemaRoot', side: 'left', rootName: 'Root' }],
      ['missing root', { type: 'selectSchemaRoot', side: 'source' }],
      ['non-string root', { type: 'selectSchemaRoot', side: 'target', rootName: 42 }],
      ['empty root', { type: 'selectSchemaRoot', side: 'source', rootName: '' }],
      ['missing instance side', { type: 'generateInstance' }],
      ['invalid instance side', { type: 'generateInstance', side: 'left' }],
      ['missing prompt data', { type: 'copilotPrompt' }],
      ['null prompt data', { type: 'copilotPrompt', data: null }],
      ['non-string prompt', { type: 'copilotPrompt', data: { prompt: 42, activePage: 0 } }],
      ['missing active page', { type: 'copilotPrompt', data: { prompt: 'Map OrderId' } }],
      ['non-numeric active page', { type: 'copilotPrompt', data: { prompt: 'Map OrderId', activePage: '0' } }],
      ['missing context data', { type: 'removeCopilotContext' }],
      ['null context data', { type: 'removeCopilotContext', data: null }],
      ['missing context id', { type: 'removeCopilotContext', data: {} }],
      ['non-string context id', { type: 'removeCopilotContext', data: { id: 42 } }],
      ['missing transform data', { type: 'testMapWithInput' }],
      ['null transform data', { type: 'testMapWithInput', data: null }],
      ['missing input XML', { type: 'testMapWithInput', data: { map: {} } }],
      ['missing transform map', { type: 'testMapWithInput', data: { inputXml: '<Order/>' } }],
      ['null transform map', { type: 'testMapWithInput', data: { inputXml: '<Order/>', map: null } }],
      ['non-object transform map', { type: 'testMapWithInput', data: { inputXml: '<Order/>', map: 'map' } }],
    ])('rejects %s independently', (_name, message) => {
      expect(isWebviewToHostMessage(message)).toBe(false);
    });
  });

  describe('host reply validation boundaries', () => {
    for (const type of HOST_TO_WEBVIEW_MESSAGE_TYPES) {
      test.each([undefined, null, false, 42, 'payload'])(`rejects non-object data for ${type}: %j`, (data) => {
        expect(isHostToWebviewMessage({ type, data })).toBe(false);
      });
    }

    test.each(['executeCompile', 'executeTestMap', 'documentChanged'])('accepts object payload for %s', (type) => {
      expect(isHostToWebviewMessage({ type, data: {} })).toBe(true);
    });

    for (const type of ['init', 'schemaStateChanged']) {
      const data = { map: {}, availableSchemas: [], functoids: [], sourceSchema: null, targetSchema: null };
      test.each(['sourceSchema', 'targetSchema'])(`accepts loaded %s in ${type}`, (field) => {
        expect(isHostToWebviewMessage({ type, data: { ...data, [field]: {} } })).toBe(true);
      });
      test.each([
        ['map', null],
        ['availableSchemas', {}],
        ['sourceSchema', undefined],
        ['sourceSchema', false],
        ['targetSchema', undefined],
        ['targetSchema', false],
      ])(`rejects invalid %s in ${type}: %j`, (field, value) => {
        expect(isHostToWebviewMessage({ type, data: { ...data, [field as string]: value } })).toBe(false);
      });
    }

    test('rejects a non-array functoid catalogue during initialization', () => {
      expect(
        isHostToWebviewMessage({
          type: 'init',
          data: { map: {}, availableSchemas: [], functoids: {}, sourceSchema: null, targetSchema: null },
        })
      ).toBe(false);
    });

    test.each([
      { type: 'schemaLoaded', data: { side: 'target', schema: {}, path: '' } },
      { type: 'instanceGenerated', data: { side: 'target', xml: '', error: 'No source schema loaded' } },
      { type: 'compileResult', data: { success: false, errors: [], warnings: [] } },
      { type: 'copilotResult', data: { success: true, applied: true, message: '', map: {} } },
      { type: 'copilotContextChanged', data: { files: [] } },
      { type: 'copilotContextChanged', data: { files: [{ id: 'context', name: 'map.xslt', size: 0 }], message: 'Loaded' } },
    ])('accepts valid reply boundary values: %j', (message) => {
      expect(isHostToWebviewMessage(message)).toBe(true);
    });

    test.each([
      ['schema object', { type: 'schemaLoaded', data: { side: 'source', schema: null, path: 'Order.xsd' } }],
      ['schema path', { type: 'schemaLoaded', data: { side: 'source', schema: {}, path: 42 } }],
      ['compile success', { type: 'compileResult', data: { success: 'true', errors: [], warnings: [] } }],
      ['compile errors', { type: 'compileResult', data: { success: true, errors: {}, warnings: [] } }],
      ['compile warnings', { type: 'compileResult', data: { success: true, errors: [], warnings: {} } }],
      ['assembly path', { type: 'assemblySelected', data: { path: 42, classes: [] } }],
      ['assembly classes', { type: 'assemblySelected', data: { path: 'Helpers.dll', classes: {} } }],
      ['instance side', { type: 'instanceGenerated', data: { side: 'left', xml: '<Order/>' } }],
      ['instance XML', { type: 'instanceGenerated', data: { side: 'source', xml: null } }],
      ['assistant success', { type: 'copilotResult', data: { success: 1, applied: true, message: 'Applied' } }],
      ['assistant message', { type: 'copilotResult', data: { success: true, applied: true, message: null } }],
      ['assistant map', { type: 'copilotResult', data: { success: true, applied: true, message: 'Applied', map: null } }],
      ['context files', { type: 'copilotContextChanged', data: { files: {} } }],
      ['context file object', { type: 'copilotContextChanged', data: { files: [null] } }],
      ['context file id', { type: 'copilotContextChanged', data: { files: [{ id: 42, name: 'map.xslt', size: 1 }] } }],
      ['context file name', { type: 'copilotContextChanged', data: { files: [{ id: 'context', name: null, size: 1 }] } }],
      ['context file size', { type: 'copilotContextChanged', data: { files: [{ id: 'context', name: 'map.xslt', size: '1' }] } }],
      ['context message', { type: 'copilotContextChanged', data: { files: [], message: false } }],
    ])('rejects invalid %s independently', (_name, message) => {
      expect(isHostToWebviewMessage(message)).toBe(false);
    });
  });

  test('creates isolated React-ready view state', () => {
    const first = createInitialMapperViewState();
    const second = createInitialMapperViewState();

    first.functoids.push({} as never);
    first.activePage = 2;

    expect(second).toEqual({
      map: null,
      sourceSchema: null,
      targetSchema: null,
      availableSchemas: [],
      functoids: [],
      selectedLink: null,
      selectedFunctoid: null,
      activePage: 0,
    });
  });
});
