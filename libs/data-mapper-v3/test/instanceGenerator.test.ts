import { XMLParser } from 'fast-xml-parser';
import { XmlParser, Xslt } from 'xslt-processor';
import { XsltCompiler } from '../src/compiler/xsltCompiler';
import { DEFAULT_MAP_OPTIONS, LinkEndpointType, type MapDocument } from '../src/model';
import { InstanceGenerator } from '../src/schema/instanceGenerator';
import { SchemaParser } from '../src/schema/schemaParser';

function leafSchema(base: string, facets = '', named = false) {
  return new SchemaParser().parse(
    `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:tns="urn:sample" targetNamespace="urn:sample">
      ${['DT', 'TM', 'N0', 'N2', 'R', 'AN']
        .map((type) => `<xs:simpleType name="X12_${type}"><xs:restriction base="xs:string"/></xs:simpleType>`)
        .join('')}
      <xs:element name="Value"${named ? ` type="${base}"` : ''}>
        ${named ? '' : `<xs:simpleType><xs:restriction base="${base}">${facets}</xs:restriction></xs:simpleType>`}
      </xs:element>
    </xs:schema>`,
    'sample.xsd'
  );
}

function generateValue(base: string, facets = '', named = false) {
  const xml = new InstanceGenerator().generate(leafSchema(base, facets, named));
  return new XMLParser({ removeNSPrefix: true, parseTagValue: false }).parse(xml).Value;
}

describe('restricted sample values', () => {
  test.each(['X12_DT', 'tns:X12_DT'])('generates an eight-digit date for %s', (base) => {
    expect(generateValue(base, '<xs:minLength value="8"/><xs:maxLength value="8"/>')).toBe('19990531');
  });
  test('retains a named EDI type when its underlying XSD type is string', () => {
    expect(generateValue('tns:X12_DT', '', true)).toBe('19990531');
  });
  test('uses a six-digit date only when required by the length facets', () => {
    expect(generateValue('X12_DT', '<xs:length value="6"/>')).toBe('990531');
  });
  test.each([
    ['X12_TM', 4, '1320'],
    ['X12_TM', 6, '132000'],
    ['X12_TM', 7, '1320000'],
    ['X12_TM', 8, '13200000'],
    ['X12_N0', 1, '1'],
    ['X12_N2', 4, '0010'],
    ['X12_R', 1, '1'],
    ['X12_R', 6, '0010.4'],
  ])('generates %s with length %i', (base, length, expected) => {
    expect(generateValue(base, `<xs:length value="${length}"/>`)).toBe(expected);
  });
  test.each([
    ['xs:string', '<xs:maxLength value="3"/>', 'Val'],
    ['X12_AN', '<xs:minLength value="10"/>', 'Value_0000'],
    ['xs:token', '<xs:length value="4"/>', 'Valu'],
    ['xs:string', '<xs:length value="0"/>', ''],
  ])('respects string lengths for %s (%s)', (base, facets, expected) => {
    expect(generateValue(base, facets)).toBe(expected);
  });
  test('preserves enumeration values', () => {
    expect(generateValue('X12_AN', '<xs:enumeration value="PO-123"/><xs:enumeration value="PO-456"/>')).toBe('PO-123');
  });
  test('preserves explicit test values, including intentional empty values', () => {
    const schema = leafSchema('X12_DT', '<xs:length value="8"/>');
    expect(new InstanceGenerator().generate(schema, { '/Value': '20260927' })).toContain('>20260927<');
    expect(new InstanceGenerator().generate(schema, { '/Value': '<empty>' })).toContain('></ns0:Value>');
  });
  test.each(['fixed', 'default'])('uses an element %s value instead of a generated placeholder', (attribute) => {
    const schema = new SchemaParser().parse(
      `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Value" type="xs:string" ${attribute}="PO-123"/></xs:schema>`,
      'defaults.xsd'
    );
    expect(new InstanceGenerator().generate(schema)).toContain('>PO-123<');
  });
  test('surfaces unsupported date lengths instead of generating invalid placeholders', () => {
    expect(() => generateValue('X12_DT', '<xs:length value="7"/>')).toThrow(/Cannot generate a X12_DT sample/);
  });
});

test('generated BEG03 reaches Basket and OrderForm OrderGroupID unchanged', async () => {
  const parser = new SchemaParser();
  const source = parser.parse(
    `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
      <xs:simpleType name="X12_AN"><xs:restriction base="xs:string"/></xs:simpleType>
      <xs:element name="X12_00401_850"><xs:complexType><xs:sequence>
        <xs:element name="BEG"><xs:complexType><xs:sequence>
          <xs:element name="BEG03"><xs:simpleType><xs:restriction base="X12_AN">
            <xs:minLength value="1"/><xs:maxLength value="22"/>
          </xs:restriction></xs:simpleType></xs:element>
        </xs:sequence></xs:complexType></xs:element>
      </xs:sequence></xs:complexType></xs:element>
    </xs:schema>`,
    'source.xsd'
  );
  const target = parser.parse(
    `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
      <xs:element name="Basket"><xs:complexType><xs:sequence>
        <xs:element name="OrderForms"><xs:complexType><xs:sequence>
          <xs:element name="OrderForm"><xs:complexType><xs:attribute name="OrderGroupID" type="xs:string"/></xs:complexType></xs:element>
        </xs:sequence></xs:complexType></xs:element>
      </xs:sequence><xs:attribute name="OrderGroupID" type="xs:string"/></xs:complexType></xs:element>
    </xs:schema>`,
    'target.xsd'
  );
  const map: MapDocument = {
    name: 'BEG03 order identifiers',
    version: '1',
    sourceSchema: { location: 'source.xsd' },
    targetSchema: { location: 'target.xsd' },
    options: { ...DEFAULT_MAP_OPTIONS },
    pages: [
      {
        id: 'page1',
        name: 'Page 1',
        functoids: [],
        links: ['/Basket/@OrderGroupID', '/Basket/OrderForms/OrderForm/@OrderGroupID'].map((targetPath, index) => ({
          id: String(index),
          sourceId: '/X12_00401_850/BEG/BEG03',
          sourcePath: '/X12_00401_850/BEG/BEG03',
          sourceType: LinkEndpointType.SchemaNode,
          targetId: targetPath,
          targetPath,
          targetType: LinkEndpointType.SchemaNode,
        })),
      },
    ],
  };
  const result = new XsltCompiler().compile(map, source, target);
  expect(result.errors).toEqual([]);
  const xmlParser = new XmlParser();
  for (const testValues of [undefined, { '/X12_00401_850/BEG/BEG03': 'PO-2026-001' }]) {
    const input = new InstanceGenerator().generate(source, testValues);
    const output = await new Xslt().xsltProcess(xmlParser.xmlParse(input), xmlParser.xmlParse(result.xslt!));
    const basket = new XMLParser({ ignoreAttributes: false }).parse(output).Basket;
    const expected = testValues ? 'PO-2026-001' : 'BEG03_0';
    expect(basket['@_OrderGroupID']).toBe(expected);
    expect(basket.OrderForms.OrderForm['@_OrderGroupID']).toBe(expected);
  }
});
