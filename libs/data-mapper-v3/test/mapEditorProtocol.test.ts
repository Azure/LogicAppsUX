import {
    createInitialMapperViewState,
    HOST_TO_WEBVIEW_MESSAGE_TYPES,
    isHostToWebviewMessage,
    isWebviewToHostMessage,
    WEBVIEW_TO_HOST_MESSAGE_TYPES
} from '../src/protocol/mapEditorProtocol';

describe('Map Editor protocol', () => {
    test('freezes the webview-to-host command names', () => {
        expect(WEBVIEW_TO_HOST_MESSAGE_TYPES).toEqual([
            'ready',
            'update',
            'compile',
            'loadSchema',
            'testMap',
            'generateInstance',
            'testMapWithInput',
            'browseAssembly',
            'exportXslt',
            'deployToLogicApps',
            'copilotPrompt',
            'browseCopilotContext',
            'removeCopilotContext',
            'clearCopilotContext'
        ]);
    });

    test('freezes the host-to-webview event names', () => {
        expect(HOST_TO_WEBVIEW_MESSAGE_TYPES).toEqual([
            'init',
            'documentChanged',
            'schemaLoaded',
            'compileResult',
            'assemblySelected',
            'instanceGenerated',
            'testMapResult',
            'copilotResult',
            'copilotContextChanged'
        ]);
    });

    test.each([
        { type: 'ready' },
        { type: 'loadSchema', side: 'source' },
        { type: 'generateInstance', side: 'target' },
        { type: 'testMapWithInput', data: { inputXml: '<Root/>', map: {} } },
        { type: 'compile', data: {} },
        { type: 'copilotPrompt', data: { prompt: 'Rename this page', activePage: 0 } },
        { type: 'browseCopilotContext' },
        { type: 'removeCopilotContext', data: { id: 'file:///requirements.txt' } },
        { type: 'clearCopilotContext' }
    ])('accepts valid webview command $type', message => {
        expect(isWebviewToHostMessage(message)).toBe(true);
    });

    test.each([
        null,
        {},
        { type: 'unknown' },
        { type: 'loadSchema', side: 'left' },
        { type: 'compile' },
        { type: 'copilotPrompt', data: { prompt: 1, activePage: '0' } },
        { type: 'testMapWithInput', data: { inputXml: 1, map: {} } }
    ])('rejects an invalid webview command', message => {
        expect(isWebviewToHostMessage(message)).toBe(false);
    });

    test.each([
        {
            type: 'init',
            data: { map: {}, sourceSchema: null, targetSchema: null, functoids: [] }
        },
        {
            type: 'schemaLoaded',
            data: { side: 'source', schema: {}, path: 'source.xsd' }
        },
        {
            type: 'compileResult',
            data: { success: true, errors: [], warnings: [] }
        },
        {
            type: 'assemblySelected',
            data: { path: 'functions.dll', classes: [] }
        },
        {
            type: 'instanceGenerated',
            data: { side: 'source', xml: '<Root/>' }
        },
        {
            type: 'testMapResult',
            data: { output: '<Result/>' }
        },
        {
            type: 'copilotResult',
            data: { success: true, applied: false, message: 'Cancelled' }
        },
        {
            type: 'copilotContextChanged',
            data: { files: [{ id: 'file:///sample.xslt', name: 'sample.xslt', size: 42 }] }
        }
    ])('accepts valid host event $type', message => {
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
        { type: 'testMapResult', data: { output: 1 } }
    ])('rejects an invalid host event', message => {
        expect(isHostToWebviewMessage(message)).toBe(false);
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
            functoids: [],
            selectedLink: null,
            selectedFunctoid: null,
            activePage: 0
        });
    });
});
