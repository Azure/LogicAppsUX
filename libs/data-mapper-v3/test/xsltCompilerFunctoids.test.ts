import * as fs from 'fs';
import * as path from 'path';
import { XMLValidator } from 'fast-xml-parser';
import { XsltCompiler } from '../src/compiler/xsltCompiler';
import { FunctoidRegistry } from '../src/functoids';
import {
    DEFAULT_MAP_OPTIONS,
    LinkEndpointType,
    MapDocument,
    MapFunctoid,
    ParameterType,
    ScriptType,
    SourceLinkOption,
    TargetLinkOption
} from '../src/model';
import { SchemaParser } from '../src/schema/schemaParser';

const fixtures = path.join(__dirname, 'fixtures', 'functoids');
const sourceSchema = new SchemaParser().parse(
    fs.readFileSync(path.join(fixtures, 'FunctoidSource.xsd'), 'utf8'),
    'src'
);
const targetSchema = new SchemaParser().parse(
    fs.readFileSync(path.join(fixtures, 'FunctoidDest.xsd'), 'utf8'),
    'dest'
);

const nodeInputFunctoids = new Set([
    322, 323, 324, 325, 326, 327, 328, 424, 474, 701, 706, 703, 704, 801, 802
]);
const invalidStandaloneFunctoids = new Set([574, 575, 703, 704]);

function createMap(functoid: MapFunctoid): MapDocument {
    const definition = FunctoidRegistry.getInstance().getFunctoid(functoid.functoidId)!;
    const links = [];

    if (nodeInputFunctoids.has(functoid.functoidId)) {
        links.push({
            id: 'input',
            sourceId: '/Root/Items/Value',
            sourcePath: '/Root/Items/Value',
            targetId: functoid.id,
            sourceType: LinkEndpointType.SchemaNode,
            targetType: LinkEndpointType.Functoid
        });
    }

    links.push({
        id: 'output',
        sourceId: functoid.id,
        targetId: '/Root/Result',
        targetPath: '/Root/Result',
        sourceType: LinkEndpointType.Functoid,
        targetType: LinkEndpointType.SchemaNode
    });

    const suppliedInputs = nodeInputFunctoids.has(functoid.functoidId) ? 1 : 0;
    for (let i = suppliedInputs; i < definition.minInputs; i++) {
        functoid.parameters.push({
            index: i,
            value: functoid.functoidId === 702 && i === 0 ? 'count(Items/Value)' : `${i + 1}`,
            type: ParameterType.Constant
        });
    }

    return {
        name: `Functoid ${functoid.functoidId}`,
        version: '1',
        sourceSchema: { location: 'FunctoidSource.xsd' },
        targetSchema: { location: '' },
        pages: [{ id: 'page1', name: 'Page 1', links, functoids: [functoid] }],
        options: { ...DEFAULT_MAP_OPTIONS }
    };
}

describe('XsltCompiler functoid coverage', () => {
    test.each(FunctoidRegistry.getInstance().getAllFunctoids().map(definition => [
        definition.id,
        definition.name
    ]))('FID %i (%s) has an explicit, well-formed compiler result', (id) => {
        const definition = FunctoidRegistry.getInstance().getFunctoid(id as number)!;
        const functoid: MapFunctoid = {
            id: 'f1',
            functoidId: definition.id,
            category: definition.category,
            name: definition.name,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: []
        };

        const result = new XsltCompiler().compile(createMap(functoid), sourceSchema);

        expect(result.xslt).toBeDefined();
        expect(XMLValidator.validate(result.xslt as string)).toBe(true);
        if (invalidStandaloneFunctoids.has(definition.id)) {
            expect(result.success).toBe(false);
            expect(result.errors[0].message).toMatch(/table-grid metadata|Database Lookup functoid/);
        } else {
            expect(result.errors).toEqual([]);
            expect(result.success).toBe(true);
            expect(result.xslt).not.toContain('math:');
            expect(result.xslt).not.toContain('string-join(');
            expect(result.xslt).not.toContain('xsl:copy-of select=&quot;');
        }
    });

    test('resolves chained functoids by compiled identity instead of page index', () => {
        const registry = FunctoidRegistry.getInstance();
        const concatenate = registry.getFunctoid(107)!;
        const uppercase = registry.getFunctoid(110)!;
        const map = createMap({
            id: 'upper',
            functoidId: uppercase.id,
            category: uppercase.category,
            name: uppercase.name,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: []
        });

        map.pages[0].functoids[0].parameters = [];

        map.pages[0].functoids.unshift({
            id: 'concat',
            functoidId: concatenate.id,
            category: concatenate.category,
            name: concatenate.name,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: [
                { index: 0, value: 'a', type: ParameterType.Constant },
                { index: 1, value: 'b', type: ParameterType.Constant }
            ]
        });
        map.pages[0].links.unshift({
            id: 'chain',
            sourceId: 'concat',
            targetId: 'upper',
            sourceType: LinkEndpointType.Functoid,
            targetType: LinkEndpointType.Functoid
        });

        const result = new XsltCompiler().compile(map, sourceSchema);

        expect(result.success).toBe(true);
        expect(result.xslt).toContain('translate($var:v1');
        expect(result.xslt).toContain('<xsl:value-of select="$var:v2" />');
    });

    test.each([
        ['Aggregate_To_CustomerServiceResponse', ['']],
        ['PO_POAck', ['1', 'Accepted']],
        ['PO_ShipmentOrderRequest', ['1', 'Road']],
        ['ShipmentOrder_ShipmentAdvice', ['1/1/2003']],
        ['UpdateRequest2UpdateResponse', [' ']]
    ])('%s accepts every single-input String Concatenate', (mapName, values) => {
        const concatenate = FunctoidRegistry.getInstance().getFunctoid(107)!;
        for (const [index, value] of values.entries()) {
            const map = createMap({
                id: `concat-${index}`,
                functoidId: concatenate.id,
                category: concatenate.category,
                name: concatenate.name,
                x: 0,
                y: 0,
                inputLinks: [],
                outputLinks: [],
                parameters: []
            });
            map.name = mapName;
            map.pages[0].functoids[0].parameters = [
                { index: 0, value, type: ParameterType.Constant }
            ];

            const result = new XsltCompiler().compile(map, sourceSchema);

            expect(result.success).toBe(true);
            expect(result.errors).toEqual([]);
            expect(result.xslt).toContain(
                `<xsl:variable name="var:v1" select="${value === '' ? "''" : `'${value}'`}" />`
            );
            expect(result.xslt).not.toContain('concat(');
        }
    });

    test('honors persisted ordering for linked and default functoid inputs', () => {
        const concatenate = FunctoidRegistry.getInstance().getFunctoid(107)!;
        const map = createMap({
            id: 'concat',
            functoidId: concatenate.id,
            category: concatenate.category,
            name: concatenate.name,
            x: 0,
            y: 0,
            inputLinks: ['text2', 'text1'],
            outputLinks: [],
            parameters: []
        });
        map.pages[0].functoids[0].parameters = [
            { index: 0, value: 'prefix-', type: ParameterType.Constant },
            { index: 1, value: 'text2', type: ParameterType.Link, defaultValue: 'fallback' },
            { index: 2, value: 'text1', type: ParameterType.Link }
        ];
        map.pages[0].links.unshift(
            {
                id: 'text1',
                sourceId: '/Root/Text1',
                sourcePath: '/Root/Text1',
                targetId: 'concat',
                sourceType: LinkEndpointType.SchemaNode,
                targetType: LinkEndpointType.Functoid
            },
            {
                id: 'text2',
                sourceId: '/Root/Text2',
                sourcePath: '/Root/Text2',
                targetId: 'concat',
                sourceType: LinkEndpointType.SchemaNode,
                targetType: LinkEndpointType.Functoid
            }
        );

        const result = new XsltCompiler().compile(map, sourceSchema);

        expect(result.success).toBe(true);
        expect(result.xslt).toContain(
            "concat('prefix-', concat(substring('fallback', 1, number(string(Text2/text()) = '') * string-length('fallback')), string(Text2/text())), Text1/text())"
        );
    });

    test('identifies the page containing a functoid compilation error', () => {
        const leftTrim = FunctoidRegistry.getInstance().getFunctoid(108)!;
        const map = createMap({
            id: 'trim',
            functoidId: leftTrim.id,
            category: leftTrim.category,
            name: leftTrim.name,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: []
        });
        map.pages[0].id = 'payment-page';
        map.pages[0].name = 'Payment Details';
        map.pages[0].functoids[0].parameters = [
            { index: 0, value: 'first', type: ParameterType.Constant },
            { index: 1, value: 'second', type: ParameterType.Constant }
        ];

        const result = new XsltCompiler().compile(map, sourceSchema);

        expect(result.success).toBe(false);
        expect(result.errors[0]).toEqual(expect.objectContaining({
            pageId: 'payment-page',
            pageName: 'Payment Details',
            elementId: 'trim'
        }));
        expect(result.errors[0].message).toBe(
            '[Payment Details] String Left Trim requires 1 input(s), but received 2'
        );
    });

    test('reports page-level schema root mismatches instead of silently omitting mappings', () => {
        const map = createMap({
            id: 'concat',
            functoidId: 107,
            category: FunctoidRegistry.getInstance().getFunctoid(107)!.category,
            name: 'String Concatenate',
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: [
                { index: 0, value: 'value', type: ParameterType.Constant }
            ]
        });
        map.pages[0].id = 'swift-page';
        map.pages[0].name = 'SWIFT Output';
        map.pages[0].links[0].targetId = '/DifferentRoot/Result';
        map.pages[0].links[0].targetPath = '/DifferentRoot/Result';

        const result = new XsltCompiler().compile(map, sourceSchema, targetSchema);

        expect(result.success).toBe(false);
        expect(result.errors).toEqual(expect.arrayContaining([
            expect.objectContaining({
                pageId: 'swift-page',
                pageName: 'SWIFT Output',
                message: "[SWIFT Output] Target links use root 'DifferentRoot', but the loaded target schema root is 'Root'"
            })
        ]));
    });

    test('declares a reused functoid result in every target branch', () => {
        const modulo = FunctoidRegistry.getInstance().getFunctoid(115)!;
        const functoid: MapFunctoid = {
            id: 'modulo',
            functoidId: modulo.id,
            category: modulo.category,
            name: modulo.name,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: []
        };
        const map = createMap(functoid);
        map.pages[0].functoids[0].parameters = [];
        map.targetSchema.location = 'FunctoidDest.xsd';
        map.pages[0].links = [
            {
                id: 'num1',
                sourceId: '/Root/Num1',
                sourcePath: '/Root/Num1',
                targetId: 'modulo',
                sourceType: LinkEndpointType.SchemaNode,
                targetType: LinkEndpointType.Functoid
            },
            {
                id: 'num2',
                sourceId: '/Root/Num2',
                sourcePath: '/Root/Num2',
                targetId: 'modulo',
                sourceType: LinkEndpointType.SchemaNode,
                targetType: LinkEndpointType.Functoid
            },
            {
                id: 'remainder',
                sourceId: 'modulo',
                targetId: '/Root/Remainder',
                targetPath: '/Root/Remainder',
                sourceType: LinkEndpointType.Functoid,
                targetType: LinkEndpointType.SchemaNode
            },
            {
                id: 'total',
                sourceId: 'modulo',
                targetId: '/Root/Total',
                targetPath: '/Root/Total',
                sourceType: LinkEndpointType.Functoid,
                targetType: LinkEndpointType.SchemaNode
            },
            {
                id: 'code',
                sourceId: '/Root/Code',
                sourcePath: '/Root/Code',
                targetId: '/Root/Average',
                targetPath: '/Root/Average',
                sourceType: LinkEndpointType.SchemaNode,
                targetType: LinkEndpointType.SchemaNode
            }
        ];

        const result = new XsltCompiler().compile(map, sourceSchema, targetSchema);

        expect(result.success).toBe(true);
        expect(result.xslt?.match(/<xsl:variable name="var:v1"/g)).toHaveLength(1);
        expect(result.xslt?.match(/<xsl:value-of select="\$var:v1"/g)).toHaveLength(2);
    });

    test('merges mappings from every page, including duplicate target nodes', () => {
        const map: MapDocument = {
            name: 'Multi-page map',
            version: '1',
            sourceSchema: { location: 'FunctoidSource.xsd' },
            targetSchema: { location: '' },
            pages: [
                {
                    id: 'page1',
                    name: 'Page 1',
                    functoids: [],
                    links: [{
                        id: 'p1-link',
                        sourceId: '/Root/Text1',
                        sourcePath: '/Root/Text1',
                        targetId: '/Root/Result',
                        targetPath: '/Root/Result',
                        sourceType: LinkEndpointType.SchemaNode,
                        targetType: LinkEndpointType.SchemaNode
                    }]
                },
                {
                    id: 'page2',
                    name: 'Page 2',
                    functoids: [],
                    links: [{
                        id: 'p2-link',
                        sourceId: '/Root/Text2',
                        sourcePath: '/Root/Text2',
                        targetId: '/Root/Result',
                        targetPath: '/Root/Result',
                        sourceType: LinkEndpointType.SchemaNode,
                        targetType: LinkEndpointType.SchemaNode
                    }]
                }
            ],
            options: { ...DEFAULT_MAP_OPTIONS }
        };

        const result = new XsltCompiler().compile(map, sourceSchema);

        expect(result.success).toBe(true);
        expect(result.xslt).toContain('<Result>');
        expect(result.xslt).toContain('<xsl:value-of select="Text1/text()" />');
        expect(result.xslt).toContain('<xsl:value-of select="Text2/text()" />');
    });

    test('declares functoid variables inside their repeating source context', () => {
        const definition = FunctoidRegistry.getInstance().getFunctoid(110)!;
        const map: MapDocument = {
            ...createMap({
                id: 'upper',
                functoidId: definition.id,
                category: definition.category,
                name: definition.name,
                x: 0,
                y: 0,
                inputLinks: [],
                outputLinks: [],
                parameters: []
            }),
            targetSchema: { location: 'FunctoidDest.xsd' }
        };
        map.pages[0].functoids[0].parameters = [];
        map.pages[0].links = [
            {
                id: 'input',
                sourceId: '/Root/Items/Value',
                sourcePath: '/Root/Items/Value',
                targetId: 'upper',
                sourceType: LinkEndpointType.SchemaNode,
                targetType: LinkEndpointType.Functoid
            },
            {
                id: 'output',
                sourceId: 'upper',
                targetId: '/Root/Line/V',
                targetPath: '/Root/Line/V',
                sourceType: LinkEndpointType.Functoid,
                targetType: LinkEndpointType.SchemaNode
            }
        ];

        const result = new XsltCompiler().compile(map, sourceSchema, targetSchema);
        const xslt = result.xslt as string;
        const loopStart = xslt.indexOf('<xsl:for-each select="Items">');
        const variable = xslt.indexOf('<xsl:variable', loopStart);
        const loopEnd = xslt.indexOf('</xsl:for-each>', loopStart);

        expect(result.success).toBe(true);
        expect(loopStart).toBeGreaterThan(-1);
        expect(variable).toBeGreaterThan(loopStart);
        expect(variable).toBeLessThan(loopEnd);
        expect(xslt).toContain("translate(Value/text()");
    });

    test('omits a target node when its optional source path does not exist', () => {
        const map = createMap({
            id: 'unused',
            functoidId: 110,
            category: FunctoidRegistry.getInstance().getFunctoid(110)!.category,
            name: 'Uppercase',
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: []
        });
        map.pages[0].functoids = [];
        map.pages[0].links = [{
            id: 'optional',
            sourceId: '/Root/Items/Value',
            sourcePath: '/Root/Items/Value',
            targetId: '/Root/Result',
            targetPath: '/Root/Result',
            sourceType: LinkEndpointType.SchemaNode,
            targetType: LinkEndpointType.SchemaNode
        }];

        const result = new XsltCompiler().compile(map, sourceSchema);

        expect(result.success).toBe(true);
        expect(result.xslt).toContain('<xsl:if test="Items/Value">');
    });

    test('wraps Value Mapping target creation in its condition', () => {
        const definition = FunctoidRegistry.getInstance().getFunctoid(375)!;
        const map = createMap({
            id: 'valueMap',
            functoidId: definition.id,
            category: definition.category,
            name: definition.name,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: [
                { index: 0, value: 'false', type: ParameterType.Constant },
                { index: 1, value: 'value', type: ParameterType.Constant }
            ]
        });
        map.pages[0].functoids[0].parameters = [
            { index: 0, value: 'false', type: ParameterType.Constant },
            { index: 1, value: 'value', type: ParameterType.Constant }
        ];

        const result = new XsltCompiler().compile(map, sourceSchema);

        expect(result.success).toBe(true);
        expect(result.xslt).toContain('<xsl:if test="string(\'false\') = \'true\'">');
        expect(result.xslt!.indexOf('<xsl:if test="string(\'false\') = \'true\'">'))
            .toBeLessThan(result.xslt!.indexOf('<Result>'));
    });

    test('emits matching external assembly namespace and extension object metadata', () => {
        const definition = FunctoidRegistry.getInstance().getFunctoid(260)!;
        const map = createMap({
            id: 'script',
            functoidId: definition.id,
            category: definition.category,
            name: definition.name,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: [
                { index: 0, value: ScriptType.ExternalAssembly, type: ParameterType.ScriptType },
                { index: 1, value: 'C:\\assemblies\\Helpers.dll', type: ParameterType.AssemblyPath },
                { index: 2, value: 'Contoso.Maps.Helpers', type: ParameterType.ClassName },
                { index: 3, value: 'Transform', type: ParameterType.MethodName }
            ],
            scriptType: ScriptType.ExternalAssembly,
            scriptImplementations: [{
                type: ScriptType.ExternalAssembly,
                assemblyPath: 'FunctionApp2.dll',
                className: 'FunctionApp2.XsltHelper',
                methodName: 'circumference',
                parameterTypes: ['System.Double'],
                returnType: 'System.Double',
                isStatic: false
            }]
        });
        map.pages[0].functoids[0].parameters = [
            { index: 0, value: ScriptType.ExternalAssembly, type: ParameterType.ScriptType },
            { index: 1, value: 'C:\\assemblies\\Helpers.dll', type: ParameterType.AssemblyPath },
            { index: 2, value: 'Contoso.Maps.Helpers', type: ParameterType.ClassName },
            { index: 3, value: 'Transform', type: ParameterType.MethodName }
        ];

        const result = new XsltCompiler().compile(map, sourceSchema);

        expect(result.success).toBe(true);
        expect(result.xslt).toContain('xmlns:ScriptNS0="http://schemas.microsoft.com/BizTalk/2003/ScriptNS0"');
        expect(result.xslt).toContain('ScriptNS0:Transform(');
        expect(result.xslt).toContain(
            '<msxsl:script language="C#" implements-prefix="ScriptNS0">'
        );
        expect(result.xslt).toContain('<msxsl:assembly href="C:\\assemblies\\Helpers.dll" />');
        expect(result.xslt).toContain('<msxsl:using namespace="Contoso.Maps" />');
        expect(result.xslt).toContain('typeof(Helpers).GetMethods()');
        expect(result.xslt).toContain('candidate.GetParameters().Length == 0');
        expect(result.xslt).toContain('return targetMethod.Invoke(target, arguments);');
        expect(result.extensionObjectXml).toContain('AssemblyName="C:\\assemblies\\Helpers.dll"');
        expect(result.extensionObjectXml).toContain('ClassName="Contoso.Maps.Helpers"');
        expect(result.extensionObjectXml).toContain('<Method Name="Transform" ParameterCount="0" />');
    });

    test('converts external assembly inputs to reflected method parameter types', () => {
        const definition = FunctoidRegistry.getInstance().getFunctoid(260)!;
        const map = createMap({
            id: 'script',
            functoidId: definition.id,
            category: definition.category,
            name: definition.name,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: [
                { index: 0, value: ScriptType.ExternalAssembly, type: ParameterType.ScriptType },
                { index: 1, value: 'FunctionApp2.dll', type: ParameterType.AssemblyPath },
                { index: 2, value: 'FunctionApp2.XsltHelper', type: ParameterType.ClassName },
                { index: 3, value: 'circumference', type: ParameterType.MethodName }
            ],
            scriptType: ScriptType.ExternalAssembly,
            scriptImplementations: [{
                type: ScriptType.ExternalAssembly,
                assemblyPath: 'FunctionApp2.dll',
                className: 'FunctionApp2.XsltHelper',
                methodName: 'circumference',
                parameterTypes: ['System.Double'],
                returnType: 'System.Double',
                isStatic: false
            }]
        });
        map.pages[0].functoids[0].parameters = [
            { index: 0, value: '12.5', type: ParameterType.Constant },
            { index: 1, value: ScriptType.ExternalAssembly, type: ParameterType.ScriptType },
            { index: 2, value: 'FunctionApp2.dll', type: ParameterType.AssemblyPath },
            { index: 3, value: 'FunctionApp2.XsltHelper', type: ParameterType.ClassName },
            { index: 4, value: 'circumference', type: ParameterType.MethodName }
        ];

        const result = new XsltCompiler().compile(map, sourceSchema);

        expect(result.success).toBe(true);
        expect(result.xslt).toContain('ScriptNS0:circumference(number(');
        expect(result.xslt).toContain('public object circumference(System.Double param0)');
        expect(result.xslt).toContain('return helper.circumference(param0);');
    });

    test('emits inline script assembly references inside the script block', () => {
        const definition = FunctoidRegistry.getInstance().getFunctoid(260)!;
        const map = createMap({
            id: 'script',
            functoidId: definition.id,
            category: definition.category,
            name: definition.name,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: [],
            scriptType: ScriptType.InlineCSharp,
            scriptContent: 'public string Run() { return Contoso.Helpers.Mapper.Run(); }',
            scriptImplementations: [{
                type: ScriptType.InlineCSharp,
                content: 'public string Run() { return Contoso.Helpers.Mapper.Run(); }',
                assemblyReferences: [
                    'Contoso.Helpers, Version=1.0.0.0, Culture=neutral',
                    'C:\\assemblies\\Local.dll'
                ]
            }]
        });

        const result = new XsltCompiler().compile(map, sourceSchema);

        expect(result.success).toBe(true);
        expect(result.xslt).toContain(
            '<msxsl:assembly name="Contoso.Helpers, Version=1.0.0.0, Culture=neutral" />'
        );
        expect(result.xslt).toContain('<msxsl:assembly href="C:\\assemblies\\Local.dll" />');
        expect(result.xslt!.indexOf('<msxsl:assembly name='))
            .toBeLessThan(result.xslt!.indexOf('<![CDATA['));
    });

    test('unrolls Table Looping rows and resolves Table Extractor grid inputs', () => {
        const tableDefinition = FunctoidRegistry.getInstance().getFunctoid(703)!;
        const extractorDefinition = FunctoidRegistry.getInstance().getFunctoid(704)!;
        const map: MapDocument = {
            name: 'Table map',
            version: '1',
            sourceSchema: { location: 'FunctoidSource.xsd' },
            targetSchema: { location: 'FunctoidDest.xsd' },
            options: { ...DEFAULT_MAP_OPTIONS },
            pages: [{
                id: 'page1',
                name: 'Page 1',
                functoids: [
                    {
                        id: 'table',
                        functoidId: 703,
                        category: tableDefinition.category,
                        name: tableDefinition.name,
                        x: 0,
                        y: 0,
                        inputLinks: [],
                        outputLinks: [],
                        parameters: [
                            { index: 0, value: 'loop-input', type: ParameterType.Link, guid: '{LOOP}' },
                            { index: 1, value: '1', type: ParameterType.Constant, guid: '{COLUMNS}' },
                            { index: 2, value: 'value-input', type: ParameterType.Link, guid: '{VALUE}' },
                            { index: 3, value: 'fixed', type: ParameterType.Constant, guid: '{FIXED}' },
                            { index: 4, value: 'name-input', type: ParameterType.Link, guid: '{NAME}' }
                        ],
                        tableLooping: {
                            columns: 1,
                            gated: false,
                            rows: [['{VALUE}'], ['{FIXED}'], ['{NAME}']]
                        }
                    },
                    {
                        id: 'extractor',
                        functoidId: 704,
                        category: extractorDefinition.category,
                        name: extractorDefinition.name,
                        x: 0,
                        y: 0,
                        inputLinks: [],
                        outputLinks: [],
                        parameters: [
                            { index: 0, value: 'table-extractor', type: ParameterType.Link },
                            { index: 1, value: '1', type: ParameterType.Constant }
                        ]
                    }
                ],
                links: [
                    {
                        id: 'loop-input',
                        sourceId: '/Root/Items',
                        sourcePath: '/Root/Items',
                        targetId: 'table',
                        sourceType: LinkEndpointType.SchemaNode,
                        targetType: LinkEndpointType.Functoid
                    },
                    {
                        id: 'value-input',
                        sourceId: '/Root/Items/Value',
                        sourcePath: '/Root/Items/Value',
                        targetId: 'table',
                        sourceType: LinkEndpointType.SchemaNode,
                        targetType: LinkEndpointType.Functoid
                    },
                    {
                        id: 'table-target',
                        sourceId: 'table',
                        targetId: '/Root/Line',
                        targetPath: '/Root/Line',
                        sourceType: LinkEndpointType.Functoid,
                        targetType: LinkEndpointType.SchemaNode
                    },
                    {
                        id: 'name-input',
                        sourceId: '/Root/Items/Value',
                        sourcePath: '/Root/Items/Value',
                        targetId: 'table',
                        sourceType: LinkEndpointType.SchemaNode,
                        targetType: LinkEndpointType.Functoid,
                        sourceLinkOption: SourceLinkOption.NameCopy
                    },
                    {
                        id: 'table-extractor',
                        sourceId: 'table',
                        targetId: 'extractor',
                        sourceType: LinkEndpointType.Functoid,
                        targetType: LinkEndpointType.Functoid
                    },
                    {
                        id: 'extractor-target',
                        sourceId: 'extractor',
                        targetId: '/Root/Line/V',
                        targetPath: '/Root/Line/V',
                        sourceType: LinkEndpointType.Functoid,
                        targetType: LinkEndpointType.SchemaNode
                    }
                ]
            }]
        };

        const result = new XsltCompiler().compile(map, sourceSchema, targetSchema);
        const xslt = result.xslt as string;

        expect(result.errors).toEqual([]);
        expect(result.success).toBe(true);
        expect(xslt).toContain('<xsl:for-each select="Items">');
        expect(xslt.match(/<ns0:Line>/g)).toHaveLength(3);
        expect(xslt).toContain('select="Value/text()"');
        expect(xslt).toContain('select="\'fixed\'"');
        expect(xslt).toContain('select="\'Value\'"');
    });

    test('preserves independent row contexts for nested Table Looping functoids', () => {
        const parser = new SchemaParser();
        const source = parser.parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
              <xs:element name="Root"><xs:complexType><xs:sequence>
                <xs:element name="Groups" maxOccurs="unbounded"><xs:complexType><xs:sequence>
                  <xs:element name="Items" maxOccurs="unbounded"><xs:complexType><xs:sequence>
                    <xs:element name="Value" type="xs:string"/>
                  </xs:sequence></xs:complexType></xs:element>
                </xs:sequence></xs:complexType></xs:element>
              </xs:sequence></xs:complexType></xs:element>
            </xs:schema>`, 'source');
        const target = parser.parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="urn:nested"
                       elementFormDefault="qualified">
              <xs:element name="Root"><xs:complexType><xs:sequence>
                <xs:element name="Batch" maxOccurs="unbounded"><xs:complexType><xs:sequence>
                  <xs:element name="Line" maxOccurs="unbounded"><xs:complexType><xs:sequence>
                    <xs:element name="V" type="xs:string"/>
                  </xs:sequence></xs:complexType></xs:element>
                </xs:sequence></xs:complexType></xs:element>
              </xs:sequence></xs:complexType></xs:element>
            </xs:schema>`, 'target');
        const tableDefinition = FunctoidRegistry.getInstance().getFunctoid(703)!;
        const extractorDefinition = FunctoidRegistry.getInstance().getFunctoid(704)!;
        const table = (
            id: string,
            loopLink: string,
            cellGuid: string,
            cellValue: string,
            cellType: ParameterType
        ): MapFunctoid => ({
            id,
            functoidId: 703,
            category: tableDefinition.category,
            name: tableDefinition.name,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: [
                { index: 0, value: loopLink, type: ParameterType.Link },
                { index: 1, value: '1', type: ParameterType.Constant },
                { index: 2, value: cellValue, type: cellType, guid: cellGuid }
            ],
            tableLooping: { columns: 1, gated: false, rows: [[cellGuid]] }
        });
        const map: MapDocument = {
            name: 'Nested tables',
            version: '1',
            sourceSchema: { location: '' },
            targetSchema: { location: '' },
            options: { ...DEFAULT_MAP_OPTIONS },
            pages: [{
                id: 'page1',
                name: 'Page 1',
                functoids: [
                    table('outer-table', 'outer-loop', '{OUTER}', 'outer', ParameterType.Constant),
                    table('inner-table', 'inner-loop', '{INNER}', 'inner-value', ParameterType.Link),
                    {
                        id: 'inner-extractor',
                        functoidId: 704,
                        category: extractorDefinition.category,
                        name: extractorDefinition.name,
                        x: 0,
                        y: 0,
                        inputLinks: [],
                        outputLinks: [],
                        parameters: [
                            { index: 0, value: 'inner-extractor-input', type: ParameterType.Link },
                            { index: 1, value: '1', type: ParameterType.Constant }
                        ]
                    }
                ],
                links: [
                    {
                        id: 'outer-loop',
                        sourceId: '/Root/Groups',
                        sourcePath: '/Root/Groups',
                        targetId: 'outer-table',
                        sourceType: LinkEndpointType.SchemaNode,
                        targetType: LinkEndpointType.Functoid
                    },
                    {
                        id: 'outer-target',
                        sourceId: 'outer-table',
                        targetId: '/Root/Batch',
                        targetPath: '/Root/Batch',
                        sourceType: LinkEndpointType.Functoid,
                        targetType: LinkEndpointType.SchemaNode
                    },
                    {
                        id: 'inner-loop',
                        sourceId: '/Root/Groups/Items',
                        sourcePath: '/Root/Groups/Items',
                        targetId: 'inner-table',
                        sourceType: LinkEndpointType.SchemaNode,
                        targetType: LinkEndpointType.Functoid
                    },
                    {
                        id: 'inner-value',
                        sourceId: '/Root/Groups/Items/Value',
                        sourcePath: '/Root/Groups/Items/Value',
                        targetId: 'inner-table',
                        sourceType: LinkEndpointType.SchemaNode,
                        targetType: LinkEndpointType.Functoid
                    },
                    {
                        id: 'inner-target',
                        sourceId: 'inner-table',
                        targetId: '/Root/Batch/Line',
                        targetPath: '/Root/Batch/Line',
                        sourceType: LinkEndpointType.Functoid,
                        targetType: LinkEndpointType.SchemaNode
                    },
                    {
                        id: 'inner-extractor-input',
                        sourceId: 'inner-table',
                        targetId: 'inner-extractor',
                        sourceType: LinkEndpointType.Functoid,
                        targetType: LinkEndpointType.Functoid
                    },
                    {
                        id: 'inner-extractor-target',
                        sourceId: 'inner-extractor',
                        targetId: '/Root/Batch/Line/V',
                        targetPath: '/Root/Batch/Line/V',
                        sourceType: LinkEndpointType.Functoid,
                        targetType: LinkEndpointType.SchemaNode
                    }
                ]
            }]
        };

        const result = new XsltCompiler().compile(map, source, target);

        expect(result.errors).toEqual([]);
        expect(result.success).toBe(true);
        expect(result.xslt).toContain(`select="*[local-name()='Groups' and namespace-uri()='']"`);
        expect(result.xslt).toContain(`select="*[local-name()='Items' and namespace-uri()='']"`);
        expect(result.xslt).toContain(`select="*[local-name()='Value' and namespace-uri()='']/text()"`);
    });

    test('wraps inline XSLT node content in its mapped target element', () => {
        const definition = FunctoidRegistry.getInstance().getFunctoid(260)!;
        const map = createMap({
            id: 'raw',
            functoidId: definition.id,
            category: definition.category,
            name: definition.name,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: [],
            scriptType: ScriptType.InlineXslt,
            scriptContent: '<xsl:text>raw-output</xsl:text>'
        });
        map.pages[0].functoids[0].parameters = [];
        map.targetSchema.location = 'FunctoidDest.xsd';
        map.pages[0].links[0].targetId = '/Root/Total';
        map.pages[0].links[0].targetPath = '/Root/Total';

        const result = new XsltCompiler().compile(map, sourceSchema, targetSchema);

        expect(result.success).toBe(true);
        expect(XMLValidator.validate(result.xslt as string)).toBe(true);
        expect(result.xslt).toContain('<xsl:text>raw-output</xsl:text>');
        expect(result.xslt).toContain('<ns0:Total>');
        expect(result.xslt).toContain('xsl:copy-of select="$var:');
    });

    test('evaluates cumulative functoids once at their common parent context', () => {
        const cumulative = FunctoidRegistry.getInstance().getFunctoid(324)!;
        const map = createMap({
            id: 'cumulative',
            functoidId: cumulative.id,
            category: cumulative.category,
            name: cumulative.name,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: []
        });
        map.targetSchema.location = 'FunctoidDest.xsd';
        map.pages[0].links = [
            {
                id: 'input',
                sourceId: '/Root/Items/Value',
                sourcePath: '/Root/Items/Value',
                targetId: 'cumulative',
                sourceType: LinkEndpointType.SchemaNode,
                targetType: LinkEndpointType.Functoid
            },
            {
                id: 'output',
                sourceId: 'cumulative',
                targetId: '/Root/Total',
                targetPath: '/Root/Total',
                sourceType: LinkEndpointType.Functoid,
                targetType: LinkEndpointType.SchemaNode
            }
        ];

        const result = new XsltCompiler().compile(map, sourceSchema, targetSchema);

        expect(result.success).toBe(true);
        expect(result.xslt).toContain('select="sum(Items/Value)"');
        expect(result.xslt).not.toContain('<xsl:for-each');
    });

    test('uses declared call-template name and parameter names at the target position', () => {
        const definition = FunctoidRegistry.getInstance().getFunctoid(260)!;
        const map = createMap({
            id: 'template',
            functoidId: definition.id,
            category: definition.category,
            name: definition.name,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: [],
            scriptType: ScriptType.InlineXsltCallTemplate,
            scriptContent: '<xsl:template name="emit-value"><xsl:param name="sourceValue"/><xsl:value-of select="$sourceValue"/></xsl:template>'
        });
        map.pages[0].functoids[0].parameters = [];
        map.pages[0].links.unshift({
            id: 'template-input',
            sourceId: '/Root/Text1',
            sourcePath: '/Root/Text1',
            targetId: 'template',
            sourceType: LinkEndpointType.SchemaNode,
            targetType: LinkEndpointType.Functoid
        });

        const result = new XsltCompiler().compile(map, sourceSchema);

        expect(result.success).toBe(true);
        expect(XMLValidator.validate(result.xslt as string)).toBe(true);
        expect(result.xslt).toContain('<xsl:call-template name="emit-value">');
        expect(result.xslt).toContain('<xsl:with-param name="sourceValue" select="Text1/text()" />');
        expect(result.xslt).toContain('<xsl:template name="emit-value">');
        expect(result.xslt).not.toContain('<Result>');
    });

    test('preserves all top-level declarations in a call-template script', () => {
        const definition = FunctoidRegistry.getInstance().getFunctoid(260)!;
        const map = createMap({
            id: 'templates',
            functoidId: definition.id,
            category: definition.category,
            name: definition.name,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: [],
            scriptType: ScriptType.InlineXsltCallTemplate,
            scriptContent: [
                '<t:variable xmlns:t="http://www.w3.org/1999/XSL/Transform" name="prefix" select="\'value:\'"/>',
                '<t:template xmlns:t="http://www.w3.org/1999/XSL/Transform" name="emit-value">',
                '  <t:param name="sourceValue"/>',
                '  <t:value-of select="concat($prefix, $sourceValue)"/>',
                '</t:template>',
                '<t:template xmlns:t="http://www.w3.org/1999/XSL/Transform" name="helper"><t:text>helper</t:text></t:template>'
            ].join('\n')
        });
        map.pages[0].functoids[0].parameters = [];
        map.pages[0].links.unshift({
            id: 'template-input',
            sourceId: '/Root/Text1',
            sourcePath: '/Root/Text1',
            targetId: 'templates',
            sourceType: LinkEndpointType.SchemaNode,
            targetType: LinkEndpointType.Functoid
        });

        const result = new XsltCompiler().compile(map, sourceSchema);

        expect(result.success).toBe(true);
        expect(result.xslt).toContain('<xsl:call-template name="emit-value">');
        expect(result.xslt).toContain('<t:variable xmlns:t="http://www.w3.org/1999/XSL/Transform"');
        expect(result.xslt).toContain('<t:template xmlns:t="http://www.w3.org/1999/XSL/Transform" name="helper">');
        expect(XMLValidator.validate(result.xslt as string)).toBe(true);
    });

    test('propagates Value Mapping guards through downstream functoids', () => {
        const valueMap = FunctoidRegistry.getInstance().getFunctoid(375)!;
        const uppercase = FunctoidRegistry.getInstance().getFunctoid(110)!;
        const map = createMap({
            id: 'upper',
            functoidId: uppercase.id,
            category: uppercase.category,
            name: uppercase.name,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: []
        });
        map.pages[0].functoids[0].parameters = [];
        map.pages[0].functoids.unshift({
            id: 'valueMap',
            functoidId: valueMap.id,
            category: valueMap.category,
            name: valueMap.name,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: [
                { index: 0, value: 'false', type: ParameterType.Constant },
                { index: 1, value: 'value', type: ParameterType.Constant }
            ]
        });
        map.pages[0].links.unshift({
            id: 'conditional-chain',
            sourceId: 'valueMap',
            targetId: 'upper',
            sourceType: LinkEndpointType.Functoid,
            targetType: LinkEndpointType.Functoid
        });

        const result = new XsltCompiler().compile(map, sourceSchema);
        const condition = 'string(\'false\') = \'true\'';
        const resultStart = result.xslt!.indexOf('<Result>');

        expect(result.success).toBe(true);
        expect(result.xslt).toContain(`<xsl:if test="${condition}">`);
        expect(result.xslt!.lastIndexOf(`<xsl:if test="${condition}">`, resultStart))
            .toBeGreaterThan(-1);
    });

    test('X12_00401_850_To_Basket regression selects the common ancestor for implicit loop paths', () => {
        const parser = new SchemaParser();
        const source = parser.parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
              <xs:element name="Root"><xs:complexType><xs:sequence>
                <xs:element name="A" maxOccurs="unbounded"><xs:complexType><xs:sequence>
                  <xs:element name="Value" type="xs:string"/>
                </xs:sequence></xs:complexType></xs:element>
                <xs:element name="B" maxOccurs="unbounded"><xs:complexType><xs:sequence>
                  <xs:element name="Value" type="xs:string"/>
                </xs:sequence></xs:complexType></xs:element>
              </xs:sequence></xs:complexType></xs:element>
            </xs:schema>`, 'source');
        const map: MapDocument = {
            name: 'Conflicting loops',
            version: '1',
            sourceSchema: { location: '' },
            targetSchema: { location: 'FunctoidDest.xsd' },
            options: { ...DEFAULT_MAP_OPTIONS },
            pages: [{
                id: 'page1',
                name: 'Page 1',
                functoids: [],
                links: [
                    {
                        id: 'a',
                        sourceId: '/Root/A/Value',
                        sourcePath: '/Root/A/Value',
                        targetId: '/Root/Line/V',
                        targetPath: '/Root/Line/V',
                        sourceType: LinkEndpointType.SchemaNode,
                        targetType: LinkEndpointType.SchemaNode
                    },
                    {
                        id: 'b',
                        sourceId: '/Root/B/Value',
                        sourcePath: '/Root/B/Value',
                        targetId: '/Root/Line/V',
                        targetPath: '/Root/Line/V',
                        sourceType: LinkEndpointType.SchemaNode,
                        targetType: LinkEndpointType.SchemaNode
                    }
                ]
            }]
        };

        const result = new XsltCompiler().compile(map, source, targetSchema);

        expect(result.success).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.warnings.some(warning =>
            warning.message.includes('multiple source loop paths') &&
            warning.message.includes('common source ancestor')
        )).toBe(true);
        expect(result.xslt).toContain('<xsl:for-each select=".">');
    });

    test.each([
        [424, 'Looping'],
        [801, 'Existence Looping']
    ])('emits every ordered source context for multi-input FID %i (%s)', (functoidId) => {
        const parser = new SchemaParser();
        const source = parser.parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
              <xs:element name="Root"><xs:complexType><xs:sequence>
                <xs:element name="A" maxOccurs="unbounded"><xs:complexType><xs:sequence>
                  <xs:element name="Value" type="xs:string"/>
                </xs:sequence></xs:complexType></xs:element>
                <xs:element name="B" maxOccurs="unbounded"><xs:complexType><xs:sequence>
                  <xs:element name="Value" type="xs:string"/>
                </xs:sequence></xs:complexType></xs:element>
              </xs:sequence></xs:complexType></xs:element>
            </xs:schema>`, 'source');
        const definition = FunctoidRegistry.getInstance().getFunctoid(functoidId)!;
        const map: MapDocument = {
            name: 'Explicit multiple loops',
            version: '1',
            sourceSchema: { location: '' },
            targetSchema: { location: 'FunctoidDest.xsd' },
            options: { ...DEFAULT_MAP_OPTIONS },
            pages: [{
                id: 'page1',
                name: 'Page 1',
                functoids: [{
                    id: 'loop',
                    functoidId,
                    category: definition.category,
                    name: definition.name,
                    x: 0,
                    y: 0,
                    inputLinks: [],
                    outputLinks: [],
                    parameters: [
                        { index: 0, value: 'loop-a', type: ParameterType.Link },
                        { index: 1, value: 'loop-b', type: ParameterType.Link }
                    ]
                }],
                links: [
                    {
                        id: 'loop-a',
                        sourceId: '/Root/A',
                        sourcePath: '/Root/A',
                        targetId: 'loop',
                        sourceType: LinkEndpointType.SchemaNode,
                        targetType: LinkEndpointType.Functoid
                    },
                    {
                        id: 'loop-b',
                        sourceId: '/Root/B',
                        sourcePath: '/Root/B',
                        targetId: 'loop',
                        sourceType: LinkEndpointType.SchemaNode,
                        targetType: LinkEndpointType.Functoid
                    },
                    {
                        id: 'loop-target',
                        sourceId: 'loop',
                        targetId: '/Root/Line',
                        targetPath: '/Root/Line',
                        sourceType: LinkEndpointType.Functoid,
                        targetType: LinkEndpointType.SchemaNode
                    },
                    {
                        id: 'value-a',
                        sourceId: '/Root/A/Value',
                        sourcePath: '/Root/A/Value',
                        targetId: '/Root/Line/V',
                        targetPath: '/Root/Line/V',
                        sourceType: LinkEndpointType.SchemaNode,
                        targetType: LinkEndpointType.SchemaNode
                    },
                    {
                        id: 'value-b',
                        sourceId: '/Root/B/Value',
                        sourcePath: '/Root/B/Value',
                        targetId: '/Root/Line/V',
                        targetPath: '/Root/Line/V',
                        sourceType: LinkEndpointType.SchemaNode,
                        targetType: LinkEndpointType.SchemaNode
                    }
                ]
            }]
        };

        const result = new XsltCompiler().compile(map, source, targetSchema);
        const xslt = result.xslt as string;

        expect(result.success).toBe(true);
        expect(xslt).toContain(`select="*[local-name()='A' and namespace-uri()='']"`);
        expect(xslt).toContain(`select="*[local-name()='B' and namespace-uri()='']"`);
        expect(xslt.match(/<ns0:Line>/g)).toHaveLength(2);
        expect(xslt).not.toContain('../B');
        expect(xslt).not.toContain('../A');
    });

    test('rejects incomplete external assembly metadata without emitting a binding', () => {
        const definition = FunctoidRegistry.getInstance().getFunctoid(260)!;
        const map = createMap({
            id: 'external',
            functoidId: definition.id,
            category: definition.category,
            name: definition.name,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: [
                { index: 0, value: ScriptType.ExternalAssembly, type: ParameterType.ScriptType },
                { index: 1, value: 'Helpers.dll', type: ParameterType.AssemblyPath },
                { index: 2, value: 'Contoso.Helpers', type: ParameterType.ClassName }
            ],
            scriptType: ScriptType.ExternalAssembly
        });
        map.pages[0].functoids[0].parameters = map.pages[0].functoids[0].parameters.slice(0, 3);

        const result = new XsltCompiler().compile(map, sourceSchema);

        expect(result.success).toBe(false);
        expect(result.errors.some(error => error.message.includes('method name'))).toBe(true);
        expect(result.xslt).not.toContain('xmlns:ScriptNS');
        expect(result.extensionObjectXml).not.toContain('<ExtensionObject ');
    });

    test.each([
        [
            TargetLinkOption.TopDown,
            `<xsl:for-each select="*[local-name()='Outer' and namespace-uri()='']">`
        ],
        [
            TargetLinkOption.BottomUp,
            `<xsl:for-each select="*[local-name()='Outer' and namespace-uri()='']/*[local-name()='Inner' and namespace-uri()='']">`
        ]
    ])('honors %s hierarchy selection for nested repeating sources', (option, expectedLoop) => {
        const parser = new SchemaParser();
        const source = parser.parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
              <xs:element name="Root"><xs:complexType><xs:sequence>
                <xs:element name="Outer" maxOccurs="unbounded"><xs:complexType><xs:sequence>
                  <xs:element name="Inner" maxOccurs="unbounded"><xs:complexType><xs:sequence>
                    <xs:element name="Value" type="xs:string"/>
                  </xs:sequence></xs:complexType></xs:element>
                </xs:sequence></xs:complexType></xs:element>
              </xs:sequence></xs:complexType></xs:element>
            </xs:schema>`, 'source');
        const map: MapDocument = {
            name: 'Hierarchy',
            version: '1',
            sourceSchema: { location: '' },
            targetSchema: { location: 'FunctoidDest.xsd' },
            options: { ...DEFAULT_MAP_OPTIONS },
            pages: [{
                id: 'page1',
                name: 'Page 1',
                functoids: [],
                links: [{
                    id: 'nested',
                    sourceId: '/Root/Outer/Inner/Value',
                    sourcePath: '/Root/Outer/Inner/Value',
                    targetId: '/Root/Line/V',
                    targetPath: '/Root/Line/V',
                    sourceType: LinkEndpointType.SchemaNode,
                    targetType: LinkEndpointType.SchemaNode,
                    targetLinkOption: option as TargetLinkOption
                }]
            }]
        };

        const result = new XsltCompiler().compile(map, source, targetSchema);

        expect(result.success).toBe(true);
        expect(result.xslt).toContain(expectedLoop);
    });

    test('omits schema group placeholders and infers the source root without loaded schemas', () => {
        const map: MapDocument = {
            name: 'Schema-less multi-page map',
            version: '1',
            sourceSchema: { location: 'Missing.Source.Schema' },
            targetSchema: { location: 'Missing.Target.Schema' },
            options: { ...DEFAULT_MAP_OPTIONS, ignoreNamespacesForLinks: true },
            pages: [{
                id: 'page1',
                name: 'First page',
                functoids: [],
                links: [{
                    id: 'first',
                    sourceId: '/Document/Body/<Choice>/First',
                    sourcePath: '/Document/Body/<Choice>/First',
                    targetId: '/Output/Group/First',
                    targetPath: '/Output/Group/First',
                    sourceType: LinkEndpointType.SchemaNode,
                    targetType: LinkEndpointType.SchemaNode
                }]
            }, {
                id: 'page2',
                name: 'Second page',
                functoids: [],
                links: [{
                    id: 'second',
                    sourceId: '/Document/Body/<Choice>/Second',
                    sourcePath: '/Document/Body/<Choice>/Second',
                    targetId: '/Output/<Choice>/Group/Second',
                    targetPath: '/Output/<Choice>/Group/Second',
                    sourceType: LinkEndpointType.SchemaNode,
                    targetType: LinkEndpointType.SchemaNode
                }]
            }]
        };

        const result = new XsltCompiler().compile(map);

        expect(result.success).toBe(true);
        expect(XMLValidator.validate(result.xslt as string)).toBe(true);
        expect(result.xslt).toContain(`match="/*[local-name()='Document']"`);
        expect(result.xslt).toContain(`<First>`);
        expect(result.xslt).toContain(`<Second>`);
        expect(result.xslt).not.toContain('<Choice>');
        expect(result.xslt).not.toContain(`local-name()='&lt;Choice&gt;'`);
    });
});
