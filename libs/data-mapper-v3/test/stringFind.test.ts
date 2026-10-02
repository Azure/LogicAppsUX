import { XMLParser } from 'fast-xml-parser';
import { XmlParser, Xslt } from 'xslt-processor';
import { XsltCompiler } from '../src/compiler/xsltCompiler';
import { FunctoidRegistry } from '../src/functoids';
import { DEFAULT_MAP_OPTIONS, LinkEndpointType, type MapDocument, ParameterType } from '../src/model';
import { SchemaParser } from '../src/schema/schemaParser';

const schema = new SchemaParser().parse(
  '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Root"><xs:complexType><xs:sequence>' +
    '<xs:element name="Value" type="xs:string"/><xs:element name="Result" type="xs:string"/>' +
    '</xs:sequence></xs:complexType></xs:element></xs:schema>',
  'string-find.xsd'
);
const definition = FunctoidRegistry.getInstance().getFunctoid(101)!;
const cases: [string, string, number][] = [
  ['abc', 'z', 0],
  ['abc', 'a', 1],
  ['abc', 'b', 2],
  ['abc', 'c', 3],
  ['abcabc', 'bc', 2],
  ['abc', 'abcd', 0],
  ['abc', 'A', 0],
  ['', 'a', 0],
  ['abc', '', 1],
  ['', '', 1],
];

async function transform(xslt: string, value: string): Promise<number> {
  const parser = new XmlParser();
  const output = await new Xslt().xsltProcess(parser.xmlParse(`<Root><Value>${value}</Value></Root>`), parser.xmlParse(xslt));
  return new XMLParser().parse(output).Root.Result;
}

describe.each(['1.0', '2.0'] as const)('String Find (XSLT %s)', (xsltVersion) => {
  describe.each([false, true])('compiled map (schema input: %s)', (linked) => {
    test.each(cases)('find(%j, %j) returns %i', async (value, substring, expected) => {
      const map: MapDocument = {
        name: 'String Find',
        version: '1',
        sourceSchema: { location: 'string-find.xsd' },
        targetSchema: { location: 'string-find.xsd' },
        options: { ...DEFAULT_MAP_OPTIONS, xsltVersion },
        pages: [
          {
            id: 'page1',
            name: 'Page 1',
            functoids: [
              {
                id: 'find',
                functoidId: definition.id,
                category: definition.category,
                name: definition.name,
                x: 0,
                y: 0,
                inputLinks: linked ? ['input'] : [],
                outputLinks: ['output'],
                parameters: [
                  { index: 0, value: linked ? 'input' : value, type: linked ? ParameterType.Link : ParameterType.Constant },
                  { index: 1, value: substring, type: ParameterType.Constant },
                ],
              },
            ],
            links: [
              ...(linked
                ? [
                    {
                      id: 'input',
                      sourceId: '/Root/Value',
                      sourcePath: '/Root/Value',
                      targetId: 'find',
                      sourceType: LinkEndpointType.SchemaNode,
                      targetType: LinkEndpointType.Functoid,
                    },
                  ]
                : []),
              {
                id: 'output',
                sourceId: 'find',
                targetId: '/Root/Result',
                targetPath: '/Root/Result',
                sourceType: LinkEndpointType.Functoid,
                targetType: LinkEndpointType.SchemaNode,
              },
            ],
          },
        ],
      };
      const result = new XsltCompiler().compile(map, schema, schema);
      expect(result.errors).toEqual([]);
      expect(result.success).toBe(true);
      expect(await transform(result.xslt!, value)).toBe(expected);
    });
  });

  test.each(cases)('registry find(%j, %j) returns %i', async (value, substring, expected) => {
    const expression = definition.generateXslt([`'${value}'`, `'${substring}'`], []);
    const xslt = `<xsl:stylesheet version="${xsltVersion}" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
      <xsl:template match="/"><Root><Result><xsl:value-of select="${expression}"/></Result></Root></xsl:template>
    </xsl:stylesheet>`;
    expect(await transform(xslt, value)).toBe(expected);
  });
});
