import { XsltCompiler } from '../src/compiler/xsltCompiler';
import { FunctoidRegistry } from '../src/functoids';
import {
    DEFAULT_MAP_OPTIONS,
    LinkEndpointType,
    MapDocument
} from '../src/model';
import { SchemaParser } from '../src/schema/schemaParser';
import {
    CompileHostRequest,
    compileHostRequest
} from '../src/worker/compilerHostProtocol';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('compiler worker parity', () => {
    test.each([false, true])('preserves compiler output across the worker boundary (unused Table Looping: %s)', async unusedTable => {
        const parser = new SchemaParser();
        const source = parser.parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                       targetNamespace="urn:source" elementFormDefault="qualified">
              <xs:element name="Root"><xs:complexType><xs:sequence>
                <xs:element name="Value" type="xs:string"/>
              </xs:sequence></xs:complexType></xs:element>
            </xs:schema>`, 'source.xsd');
        const target = parser.parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                       targetNamespace="urn:target" elementFormDefault="qualified">
              <xs:element name="Root"><xs:complexType><xs:sequence>
                <xs:element name="Out" type="xs:string"/>
              </xs:sequence></xs:complexType></xs:element>
            </xs:schema>`, 'target.xsd');
        const map: MapDocument = {
            name: 'Worker parity',
            version: '1',
            sourceSchema: { location: 'source.xsd' },
            targetSchema: { location: 'target.xsd' },
            options: { ...DEFAULT_MAP_OPTIONS, preserveSequenceOrder: false },
            pages: [{
                id: 'page1',
                name: 'Page 1',
                functoids: [],
                links: [{
                    id: 'link1',
                    sourceId: '/Root/Value',
                    sourcePath: '/Root/Value',
                    targetId: '/Root/Out',
                    targetPath: '/Root/Out',
                    sourceType: LinkEndpointType.SchemaNode,
                    targetType: LinkEndpointType.SchemaNode
                }]
            }]
        };
        if (unusedTable) {
            const definition = FunctoidRegistry.getInstance().getFunctoid(703)!;
            map.pages[0].functoids.push({
                id: 'unused-table',
                functoidId: definition.id,
                category: definition.category,
                name: definition.name,
                x: 0,
                y: 0,
                inputLinks: [],
                outputLinks: [],
                parameters: []
            });
        }
        const expected = new XsltCompiler().compile(map, source, target);
        const serialized = JSON.parse(JSON.stringify({
            id: 1,
            map,
            sourceSchema: source,
            targetSchema: target
        })) as CompileHostRequest;

        const actual = await compileHostRequest(serialized, new XsltCompiler());

        expect(actual).toEqual(expected);
        expect(actual.success).toBe(true);
        expect(actual.warnings).toHaveLength(unusedTable ? 1 : 0);
        expect(actual.xslt).toContain('xmlns:s0="urn:source"');
        expect(actual.xslt).toContain('xmlns:ns0="urn:target"');
    });

    test('loads identical source and target schemas once from lightweight references', async () => {
        const schemaXml = `
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
              <xs:element name="Root"><xs:complexType><xs:sequence>
                <xs:element name="Value" type="xs:string"/>
              </xs:sequence></xs:complexType></xs:element>
            </xs:schema>`;
        const parseSpy = jest.spyOn(SchemaParser.prototype, 'parseWithImports');
        const map: MapDocument = {
            name: 'Reference transport',
            version: '1',
            sourceSchema: { location: '', inlineSchemaXml: schemaXml },
            targetSchema: { location: '', inlineSchemaXml: schemaXml },
            options: { ...DEFAULT_MAP_OPTIONS },
            pages: [{
                id: 'page1',
                name: 'Page 1',
                functoids: [],
                links: [{
                    id: 'link1',
                    sourceId: '/Root/Value',
                    sourcePath: '/Root/Value',
                    targetId: '/Root/Value',
                    targetPath: '/Root/Value',
                    sourceType: LinkEndpointType.SchemaNode,
                    targetType: LinkEndpointType.SchemaNode
                }]
            }]
        };

        const result = await compileHostRequest({
            id: 1,
            map,
            sourceSchemaReference: { inlineSchemaXml: schemaXml },
            targetSchemaReference: { inlineSchemaXml: schemaXml }
        }, new XsltCompiler());

        expect(result.success).toBe(true);
        expect(result.xslt).toContain('<Value>');
        expect(parseSpy).toHaveBeenCalledTimes(1);
    });

    test('loads UTF-16 file-backed schemas through lightweight references', async () => {
        const schemaXml = `<?xml version="1.0" encoding="utf-16"?>
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
              <xs:element name="Root"><xs:complexType><xs:sequence>
                <xs:element name="Value" type="xs:string"/>
              </xs:sequence></xs:complexType></xs:element>
            </xs:schema>`;
        const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'btm-schema-'));
        const schemaPath = path.join(directory, 'schema.xsd');
        fs.writeFileSync(schemaPath, Buffer.concat([
            Buffer.from([0xff, 0xfe]),
            Buffer.from(schemaXml, 'utf16le')
        ]));
        const map: MapDocument = {
            name: 'UTF-16 reference transport',
            version: '1',
            sourceSchema: { location: schemaPath },
            targetSchema: { location: schemaPath },
            options: { ...DEFAULT_MAP_OPTIONS },
            pages: [{
                id: 'page1',
                name: 'Page 1',
                functoids: [],
                links: [{
                    id: 'link1',
                    sourceId: '/Root/Value',
                    sourcePath: '/Root/Value',
                    targetId: '/Root/Value',
                    targetPath: '/Root/Value',
                    sourceType: LinkEndpointType.SchemaNode,
                    targetType: LinkEndpointType.SchemaNode
                }]
            }]
        };

        try {
            const result = await compileHostRequest({
                id: 1,
                map,
                sourceSchemaReference: { filePath: schemaPath },
                targetSchemaReference: { filePath: schemaPath }
            }, new XsltCompiler());

            expect(result.success).toBe(true);
            expect(result.xslt).toContain('<Value>');
        } finally {
            fs.rmSync(directory, { recursive: true, force: true });
        }
    });
});
