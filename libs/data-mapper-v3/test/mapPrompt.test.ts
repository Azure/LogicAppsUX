import {
    applyMapPatches,
    createMapPatchValidationContext,
    createMapPrompt,
    parseMapPromptResponse
} from '../src/copilot/mapPrompt';
import { MapDocument } from '../src/model/mapModel';

const map = {
    name: 'Original',
    version: '1.0',
    sourceSchema: { location: 'source.xsd' },
    targetSchema: { location: 'target.xsd' },
    options: {
        omitXmlDeclaration: false,
        xsltVersion: '1.0',
        xsltEncoding: 'UTF-8',
        preserveSequenceOrder: true,
        treatElementsAsRecords: true,
        optimizeValueMapping: false,
        generateDefaultFixedNodes: false,
        ignoreNamespacesForLinks: false,
        outputMethod: 'xml'
    },
    pages: [{ id: 'page1', name: 'Page 1', links: [], functoids: [] }]
} as MapDocument;

describe('Copilot map patches', () => {
    test('includes selected reference files as read-only prompt context', () => {
        const prompt = createMapPrompt(
            'Use the example mapping',
            map,
            0,
            undefined,
            undefined,
            [],
            [{ name: 'example.xslt', content: '<xsl:stylesheet version="1.0"/>' }]
        );

        expect(prompt).toContain('"name":"example.xslt"');
        expect(prompt).toContain('<xsl:stylesheet version=\\"1.0\\"/>');
        expect(prompt).toContain('read-only supporting context');
    });

    test('instructs the agent to prefer described built-in functoids over scripting', () => {
        const prompt = createMapPrompt(
            'Add five days to OrderDate',
            map,
            0,
            undefined,
            undefined,
            [{
                id: 122,
                name: 'Add Days',
                category: 'DateTime' as never,
                description: 'Adds a number of days to a date',
                tooltip: 'Add days to date',
                minInputs: 2,
                maxInputs: 2,
                hasOutput: true
            }]
        );

        expect(prompt).toContain('Always search the Available functoids catalog');
        expect(prompt).toContain('use Add Days (functoidId 122)');
        expect(prompt).toContain('"description":"Adds a number of days to a date"');
        expect(prompt).toContain('"tooltip":"Add days to date"');
        expect(prompt).toContain('userCSharp:DateAddDays(...)');
        expect(prompt).toContain('Separate genuinely custom methods from compiler helpers');
        expect(prompt).toContain('Do not create source-record to target-record links');
        expect(prompt).toContain('audit every xsl:value-of');
    });

    test('parses fenced JSON and applies page edits without mutating the source', () => {
        const response = parseMapPromptResponse(`\`\`\`json
{"summary":"Rename and add a page","patches":[
  {"op":"replace","path":"/pages/0/name","value":"Main"},
  {"op":"add","path":"/pages/-","value":{"id":"page2","name":"Details","links":[],"functoids":[]}}
]}
\`\`\``);

        const updated = applyMapPatches(map, response.patches);

        expect(response.summary).toBe('Rename and add a page');
        expect(updated.pages.map(page => page.name)).toEqual(['Main', 'Details']);
        expect(map.pages.map(page => page.name)).toEqual(['Page 1']);
    });

    test('supports move operations for ordering', () => {
        const withPages = {
            ...map,
            pages: [
                map.pages[0],
                { id: 'page2', name: 'Second', links: [], functoids: [] }
            ]
        };

        const updated = applyMapPatches(withPages, [
            { op: 'move', from: '/pages/1', path: '/pages/0' }
        ]);

        expect(updated.pages.map(page => page.id)).toEqual(['page2', 'page1']);
    });

    test('rejects protected fields and invalid map structures', () => {
        expect(() => applyMapPatches(map, [
            { op: 'replace', path: '/sourceSchema/location', value: 'other.xsd' }
        ])).toThrow('protected map field');

        expect(() => applyMapPatches(map, [
            { op: 'remove', path: '/pages/0' }
        ])).toThrow('invalid');
    });

    test('rejects unsafe JSON Pointer segments', () => {
        expect(() => applyMapPatches(map, [
            { op: 'add', path: '/pages/__proto__/polluted', value: true }
        ])).toThrow('Unsafe JSON Pointer');
    });

    test('rejects newly introduced dangling functoid links', () => {
        expect(() => applyMapPatches(map, [{
            op: 'add',
            path: '/pages/0/links/-',
            value: {
                id: 'bad-link',
                sourceId: '/Root/Value',
                sourcePath: '/Root/Value',
                targetId: 'missing-functoid',
                sourceType: 'schemaNode',
                targetType: 'functoid'
            }
        }])).toThrow('missing-target-functoid');
    });

    test('allows link and functoid IDs to overlap in their separate namespaces', () => {
        const updated = applyMapPatches(map, [
            {
                op: 'add',
                path: '/pages/0/functoids/-',
                value: {
                    id: '1',
                    functoidId: 107,
                    category: 'String',
                    name: 'String Concatenate',
                    x: 300,
                    y: 160,
                    inputLinks: [],
                    outputLinks: [],
                    parameters: []
                }
            },
            {
                op: 'add',
                path: '/pages/0/links/-',
                value: {
                    id: '1',
                    sourceId: '/Root/Source',
                    sourcePath: '/Root/Source',
                    targetId: '/Root/Target',
                    targetPath: '/Root/Target',
                    sourceType: 'schemaNode',
                    targetType: 'schemaNode'
                }
            }
        ]);

        expect(updated.pages[0].functoids[0].id).toBe('1');
        expect(updated.pages[0].links[0].id).toBe('1');
    });

    test('accepts scripting code in script configuration fields', () => {
        const script = 'public string Transform(string value) { return value.Trim(); }';
        const updated = applyMapPatches(map, [{
            op: 'add',
            path: '/pages/0/functoids/-',
            value: {
                id: 'script1',
                functoidId: 260,
                category: 'Advanced',
                name: 'Scripting',
                x: 300,
                y: 200,
                inputLinks: [],
                outputLinks: [],
                parameters: [],
                scriptType: 'inlineCSharp',
                scriptContent: script,
                scriptImplementations: [{ type: 'inlineCSharp', content: script }]
            }
        }]);

        expect(updated.pages[0].functoids[0].scriptContent).toBe(script);
        expect(updated.pages[0].functoids[0].parameters).toEqual([]);
    });

    test('rejects scripting code stored as an input parameter', () => {
        expect(() => applyMapPatches(map, [{
            op: 'add',
            path: '/pages/0/functoids/-',
            value: {
                id: 'script1',
                functoidId: 260,
                category: 'Advanced',
                name: 'Scripting',
                x: 300,
                y: 200,
                inputLinks: [],
                outputLinks: [],
                parameters: [{
                    index: 0,
                    type: 'scriptBody',
                    value: 'public string Transform() { return ""; }'
                }],
                scriptType: 'inlineCSharp'
            }
        }])).toThrow('script-configuration-in-parameter');
    });

    test('rejects compiler-generated DateAddDays helper as custom scripting', () => {
        const generatedHelper = [
            'public string DateAddDays(string date, string days)',
            '{',
            '    DateTime dt = DateTime.Parse(date);',
            '    return dt.AddDays(Double.Parse(days)).ToString("yyyy-MM-dd");',
            '}'
        ].join('\n');

        expect(() => applyMapPatches(map, [{
            op: 'add',
            path: '/pages/0/functoids/-',
            value: {
                id: 'wrong-script',
                functoidId: 260,
                category: 'Advanced',
                name: 'Scripting',
                x: 300,
                y: 200,
                inputLinks: [],
                outputLinks: [],
                parameters: [],
                scriptType: 'inlineCSharp',
                scriptContent: generatedHelper,
                scriptImplementations: [{
                    type: 'inlineCSharp',
                    content: generatedHelper
                }]
            }
        }])).toThrow('use-Add-Days-functoid-122');
    });

    test('rejects an invented record-to-record link while reconstructing XSLT', () => {
        expect(() => applyMapPatches(map, [{
            op: 'add',
            path: '/pages/0/links/-',
            value: {
                id: 'child-loop',
                sourceId: '/Root/Child',
                sourcePath: '/Root/Child',
                targetId: '/Root/Child',
                targetPath: '/Root/Child',
                sourceType: 'schemaNode',
                targetType: 'schemaNode'
            }
        }], {
            sourcePaths: new Set(['/Root/Child']),
            targetPaths: new Set(['/Root/Child']),
            sourceContainerPaths: new Set(['/Root/Child']),
            targetContainerPaths: new Set(['/Root/Child']),
            functoidIds: new Set([122, 260]),
            reverseEngineeringXslt: true,
            expectedExternalMethods: []
        })).toThrow('invented-structural-record-link');
    });

    test('requires extension object metadata to produce an external assembly functoid', () => {
        const context = {
            sourcePaths: new Set<string>(),
            targetPaths: new Set<string>(),
            sourceContainerPaths: new Set<string>(),
            targetContainerPaths: new Set<string>(),
            functoidIds: new Set([260]),
            reverseEngineeringXslt: true,
            expectedExternalMethods: [{
                assemblyPath: 'C:\\Functions\\Helpers.dll',
                className: 'Helpers.XsltFunctions',
                methodName: 'circumference',
                parameterCount: 0
            }]
        };
        const inline = 'public string circumference(string value) { return value; }';
        expect(() => applyMapPatches(map, [{
            op: 'add',
            path: '/pages/0/functoids/-',
            value: {
                id: 'wrong-inline',
                functoidId: 260,
                category: 'Advanced',
                name: 'Scripting',
                x: 300,
                y: 200,
                inputLinks: [],
                outputLinks: [],
                parameters: [],
                scriptType: 'inlineCSharp',
                scriptContent: inline,
                scriptImplementations: [{ type: 'inlineCSharp', content: inline }]
            }
        }], context)).toThrow('external-assembly Scripting functoid');

        const updated = applyMapPatches(map, [
            {
                op: 'add',
                path: '/pages/0/functoids/-',
                value: {
                    id: 'external',
                    functoidId: 260,
                    category: 'Advanced',
                    name: 'Scripting',
                    x: 300,
                    y: 200,
                    inputLinks: [],
                    outputLinks: ['external-output'],
                    parameters: [],
                    scriptType: 'externalAssembly',
                    scriptImplementations: [{
                        type: 'externalAssembly',
                        assemblyPath: 'C:\\Functions\\Helpers.dll',
                        className: 'Helpers.XsltFunctions',
                        methodName: 'circumference'
                    }]
                }
            },
            {
                op: 'add',
                path: '/pages/0/links/-',
                value: {
                    id: 'external-output',
                    sourceId: 'external',
                    targetId: '/Root/Result',
                    targetPath: '/Root/Result',
                    sourceType: 'functoid',
                    targetType: 'schemaNode'
                }
            }
        ], context);
        expect(updated.pages[0].functoids[0].scriptType).toBe('externalAssembly');
    });

    test('joins XSLT ScriptNS calls to matching extension object metadata', () => {
        const context = createMapPatchValidationContext(
            undefined,
            undefined,
            [],
            [
                {
                    name: 'map.xslt',
                    content: '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" '
                        + 'xmlns:ScriptNS0="urn:external"><xsl:value-of '
                        + 'select="ScriptNS0:circumference(Code/text())"/></xsl:stylesheet>'
                },
                {
                    name: 'map_extension.xml',
                    content: '<ExtensionObjects><ExtensionObject Namespace="urn:external" '
                        + 'AssemblyName="C:\\Functions\\Helpers.dll" ClassName="Helpers.XsltFunctions">'
                        + '<Method Name="circumference" ParameterCount="1"/>'
                        + '<Method Name="unused" ParameterCount="1"/>'
                        + '</ExtensionObject></ExtensionObjects>'
                }
            ]
        );

        expect(context.expectedExternalMethods).toEqual([{
            assemblyPath: 'C:\\Functions\\Helpers.dll',
            className: 'Helpers.XsltFunctions',
            methodName: 'circumference',
            parameterCount: 1
        }]);
    });
});
