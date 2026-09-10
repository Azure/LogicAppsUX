import { XMLValidator } from 'fast-xml-parser';
import { XsltCompiler } from '../src/compiler/xsltCompiler';
import { FunctoidRegistry } from '../src/functoids';
import {
    DEFAULT_MAP_OPTIONS,
    FunctoidCategory,
    LinkEndpointType,
    MapDocument,
    ParameterType,
    ScriptType
} from '../src/model';
import { SchemaParser } from '../src/schema/schemaParser';

const parser = new SchemaParser();

function mapWith(
    links: MapDocument['pages'][number]['links'],
    functoids: MapDocument['pages'][number]['functoids'] = []
): MapDocument {
    return {
        name: 'P1 map',
        version: '1',
        sourceSchema: { location: '' },
        targetSchema: { location: '' },
        options: { ...DEFAULT_MAP_OPTIONS, preserveSequenceOrder: false },
        pages: [{ id: 'page1', name: 'Page 1', links, functoids }]
    };
}

describe('XsltCompiler P1 compatibility', () => {
    test('preserves full legacy script function declarations for all inline languages', () => {
        const scripts = [
            {
                id: 'csharp',
                target: '/Root/CSharp',
                type: ScriptType.InlineCSharp,
                body: 'public string MyCSharp(string left, string right) { return left + right; }',
                call: 'userCSharp:MyCSharp'
            },
            {
                id: 'vb',
                target: '/Root/VB',
                type: ScriptType.InlineVbNet,
                body: 'Public Function MyVB(ByVal left As String, ByVal right As String) As String\nReturn left + right\nEnd Function',
                call: 'userVB:MyVB'
            },
            {
                id: 'jscript',
                target: '/Root/JScript',
                type: ScriptType.InlineJScript,
                body: 'function MyJScript(left, right) { return left + right; }',
                call: 'userJScript:MyJScript'
            }
        ];
        const links: MapDocument['pages'][number]['links'] = scripts.flatMap(script => [
            {
                id: `${script.id}-left`,
                sourceId: '/Root/Left',
                sourcePath: '/Root/Left',
                targetId: script.id,
                sourceType: LinkEndpointType.SchemaNode,
                targetType: LinkEndpointType.Functoid
            },
            {
                id: `${script.id}-right`,
                sourceId: '/Root/Right',
                sourcePath: '/Root/Right',
                targetId: script.id,
                sourceType: LinkEndpointType.SchemaNode,
                targetType: LinkEndpointType.Functoid
            },
            {
                id: `${script.id}-output`,
                sourceId: script.id,
                targetId: script.target,
                targetPath: script.target,
                sourceType: LinkEndpointType.Functoid,
                targetType: LinkEndpointType.SchemaNode
            }
        ]);
        const functoids: MapDocument['pages'][number]['functoids'] = scripts.map((script, index) => ({
            id: script.id,
            functoidId: 260,
            category: FunctoidCategory.Advanced,
            name: 'Scripting',
            x: 100,
            y: index * 50,
            inputLinks: [`${script.id}-left`, `${script.id}-right`],
            outputLinks: [`${script.id}-output`],
            parameters: [
                { index: 0, type: ParameterType.ScriptType, value: script.type },
                { index: 1, type: ParameterType.ScriptBody, value: script.body }
            ]
        }));

        const result = new XsltCompiler().compile(mapWith(links, functoids));

        expect(result.success).toBe(true);
        for (const script of scripts) {
            expect(result.xslt).toContain(script.body);
            expect(result.xslt).toContain(script.call);
        }
        expect(result.xslt).not.toContain('public string ScriptFn');
        expect(result.xslt).not.toContain('Public Function ScriptFn');
        expect(result.xslt).not.toContain('function ScriptFn');
    });

    test('honors output settings and processing-instruction copying', () => {
        const map = mapWith([{
            id: 'value',
            sourceId: '/Root/Value',
            sourcePath: '/Root/Value',
            targetId: '/Root/Out',
            targetPath: '/Root/Out',
            sourceType: LinkEndpointType.SchemaNode,
            targetType: LinkEndpointType.SchemaNode
        }]);
        map.options = {
            ...map.options,
            omitXmlDeclaration: false,
            xsltVersion: '2.0',
            xsltEncoding: 'utf-16',
            outputMethod: 'html',
            copyProcessingInstructions: true
        };

        const result = new XsltCompiler().compile(map);

        expect(result.success).toBe(true);
        expect(result.xslt).toContain('version="2.0"');
        expect(result.xslt).toContain('omit-xml-declaration="no" method="html"');
        expect(result.xslt).toContain('encoding="utf-16"');
        expect(result.xslt).toContain('<xsl:apply-templates select="processing-instruction()" />');
        expect(result.xslt).toContain('<xsl:template match="processing-instruction()">');
    });

    test('generates schema defaults, target constants, qualified attributes, and nil propagation', () => {
        const source = parser.parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="urn:source"
                       elementFormDefault="qualified">
              <xs:element name="Root"><xs:complexType><xs:sequence>
                <xs:element name="Value" type="xs:string" nillable="true"/>
              </xs:sequence></xs:complexType></xs:element>
            </xs:schema>`, 'source');
        const target = parser.parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="urn:target"
                       elementFormDefault="qualified" attributeFormDefault="qualified">
              <xs:element name="Root"><xs:complexType><xs:sequence>
                <xs:element name="Out" type="xs:string" nillable="true"/>
                <xs:element name="Defaulted" type="xs:string" fixed="schema-value"/>
                <xs:element name="Constant" type="xs:string"/>
                <xs:element name="Unmapped"><xs:complexType><xs:sequence>
                  <xs:element name="UnrelatedDefault" type="xs:string" fixed="skip-me"/>
                </xs:sequence></xs:complexType></xs:element>
              </xs:sequence><xs:attribute name="Code" type="xs:string" fixed="fixed-code"/>
              </xs:complexType></xs:element>
            </xs:schema>`, 'target');
        const map = mapWith([{
            id: 'value',
            sourceId: '/Root/Value',
            sourcePath: '/Root/Value',
            targetId: '/Root/Out',
            targetPath: '/Root/Out',
            sourceType: LinkEndpointType.SchemaNode,
            targetType: LinkEndpointType.SchemaNode
        }]);
        map.targetValues = { '/Root/Constant': 'map-value' };

        const result = new XsltCompiler().compile(map, source, target);
        const xslt = result.xslt as string;

        expect(result.success).toBe(true);
        expect(xslt).toContain('<ns0:Out>');
        expect(xslt).toContain(`@xsi:nil = 'true'`);
        expect(xslt).toContain('<xsl:attribute name="xsi:nil">true</xsl:attribute>');
        expect(xslt).toContain('<ns0:Defaulted>');
        expect(xslt).toContain(`select="'schema-value'"`);
        expect(xslt).toContain('<ns0:Constant>');
        expect(xslt).toContain(`select="'map-value'"`);
        expect(xslt).toContain('<xsl:attribute name="ns0:Code">');
        expect(xslt).not.toContain('Unmapped');
        expect(xslt).not.toContain('skip-me');
        expect(XMLValidator.validate(xslt)).toBe(true);
    });

    test('preserves source sequence order with source-child branches', () => {
        const source = parser.parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
              <xs:element name="Root"><xs:complexType><xs:sequence>
                <xs:element name="A" type="xs:string" maxOccurs="unbounded"/>
                <xs:element name="B" type="xs:string" maxOccurs="unbounded"/>
              </xs:sequence></xs:complexType></xs:element>
            </xs:schema>`, 'source');
        const target = parser.parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
              <xs:element name="Root"><xs:complexType><xs:sequence>
                <xs:element name="X" type="xs:string" maxOccurs="unbounded"/>
                <xs:element name="Y" type="xs:string" maxOccurs="unbounded"/>
              </xs:sequence></xs:complexType></xs:element>
            </xs:schema>`, 'target');
        const map = mapWith([
            {
                id: 'a',
                sourceId: '/Root/A',
                sourcePath: '/Root/A',
                targetId: '/Root/X',
                targetPath: '/Root/X',
                sourceType: LinkEndpointType.SchemaNode,
                targetType: LinkEndpointType.SchemaNode
            },
            {
                id: 'b',
                sourceId: '/Root/B',
                sourcePath: '/Root/B',
                targetId: '/Root/Y',
                targetPath: '/Root/Y',
                sourceType: LinkEndpointType.SchemaNode,
                targetType: LinkEndpointType.SchemaNode
            }
        ]);
        map.options.preserveSequenceOrder = true;

        const result = new XsltCompiler().compile(map, source, target);

        expect(result.success).toBe(true);
        expect(result.xslt).toContain('<xsl:for-each select="*">');
        expect(result.xslt).toContain(`<xsl:if test="local-name()='A'">`);
        expect(result.xslt).toContain(`<xsl:if test="local-name()='B'">`);
    });

    test('ignores source namespaces in generated link XPath when configured', () => {
        const source = parser.parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="urn:source"
                       elementFormDefault="qualified">
              <xs:element name="Root"><xs:complexType><xs:sequence>
                <xs:element name="Value" type="xs:string"/>
              </xs:sequence></xs:complexType></xs:element>
            </xs:schema>`, 'source');
        const map = mapWith([{
            id: 'value',
            sourceId: '/Root/Value',
            sourcePath: '/Root/Value',
            targetId: '/Root/Out',
            targetPath: '/Root/Out',
            sourceType: LinkEndpointType.SchemaNode,
            targetType: LinkEndpointType.SchemaNode
        }]);
        map.options.ignoreNamespacesForLinks = true;

        const result = new XsltCompiler().compile(map, source);

        expect(result.success).toBe(true);
        expect(result.xslt).toContain(`/*[local-name()='Root']`);
        expect(result.xslt).toContain(`*[local-name()='Value']/text()`);
        expect(result.xslt).not.toContain('s0:Value');
    });

    test('uses custom XSLT and merges custom extension objects', () => {
        const map = mapWith([]);
        map.customXslt = [
            '<?xml version="1.0"?>',
            '<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">',
            '<xsl:template match="/"><custom/></xsl:template>',
            '</xsl:stylesheet>'
        ].join('');
        map.customExtensionXml = [
            '<ExtensionObjects>',
            '<ExtensionObject Namespace="urn:custom" AssemblyName="Custom" ClassName="Custom.Extension"/>',
            '</ExtensionObjects>'
        ].join('');

        const result = new XsltCompiler().compile(map);

        expect(result.success).toBe(true);
        expect(result.xslt).toBe(map.customXslt);
        expect(result.extensionObjectXml).toContain('Namespace="urn:custom"');
    });

    test('applies multi-level Index predicates to repeating ancestors', () => {
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
        const definition = FunctoidRegistry.getInstance().getFunctoid(323)!;
        const map = mapWith([
            {
                id: 'index-source',
                sourceId: '/Root/Outer/Inner/Value',
                sourcePath: '/Root/Outer/Inner/Value',
                targetId: 'index',
                sourceType: LinkEndpointType.SchemaNode,
                targetType: LinkEndpointType.Functoid
            },
            {
                id: 'index-output',
                sourceId: 'index',
                targetId: '/Root/Out',
                targetPath: '/Root/Out',
                sourceType: LinkEndpointType.Functoid,
                targetType: LinkEndpointType.SchemaNode
            }
        ], [{
            id: 'index',
            functoidId: 323,
            category: definition.category,
            name: definition.name,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: [
                { index: 1, value: '2', type: ParameterType.Constant },
                { index: 2, value: '3', type: ParameterType.Constant }
            ]
        }]);

        const result = new XsltCompiler().compile(map, source);

        expect(result.success).toBe(true);
        expect(result.xslt).toContain(`local-name()='Inner' and namespace-uri()=''][number('2')]`);
        expect(result.xslt).toContain(`local-name()='Outer' and namespace-uri()=''][number('3')]`);
        expect(result.xslt).not.toContain(`local-name()='Value' and namespace-uri()=''][number(`);
    });

    test('suppresses descendant mappings below Mass Copy targets', () => {
        const source = parser.parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
              <xs:element name="Root"><xs:complexType><xs:sequence>
                <xs:element name="Record"><xs:complexType mixed="true"><xs:sequence>
                  <xs:element name="Child" type="xs:string"/>
                </xs:sequence></xs:complexType></xs:element>
              </xs:sequence></xs:complexType></xs:element>
            </xs:schema>`, 'source');
        const target = parser.parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
              <xs:element name="Root"><xs:complexType><xs:sequence>
                <xs:element name="Record"><xs:complexType><xs:sequence>
                  <xs:element name="Child" type="xs:string"/>
                </xs:sequence></xs:complexType></xs:element>
              </xs:sequence></xs:complexType></xs:element>
            </xs:schema>`, 'target');
        const definition = FunctoidRegistry.getInstance().getFunctoid(802)!;
        const map = mapWith([
            {
                id: 'mass-source',
                sourceId: '/Root/Record',
                sourcePath: '/Root/Record',
                targetId: 'mass',
                sourceType: LinkEndpointType.SchemaNode,
                targetType: LinkEndpointType.Functoid
            },
            {
                id: 'mass-output',
                sourceId: 'mass',
                targetId: '/Root/Record',
                targetPath: '/Root/Record',
                sourceType: LinkEndpointType.Functoid,
                targetType: LinkEndpointType.SchemaNode
            },
            {
                id: 'conflict',
                sourceId: '/Root/Record/Child',
                sourcePath: '/Root/Record/Child',
                targetId: '/Root/Record/Child',
                targetPath: '/Root/Record/Child',
                sourceType: LinkEndpointType.SchemaNode,
                targetType: LinkEndpointType.SchemaNode
            }
        ], [{
            id: 'mass',
            functoidId: 802,
            category: definition.category,
            name: definition.name,
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: []
        }]);

        const result = new XsltCompiler().compile(map, source, target);

        expect(result.success).toBe(true);
        expect(result.warnings.some(warning => warning.message.includes('suppresses'))).toBe(true);
        expect(result.xslt).toContain('/@* |');
        expect(result.xslt).toContain('/node()');
        expect(result.xslt).not.toContain('<Child>');
    });
});
