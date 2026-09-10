/**
 * BizTalk Data Mapper - Unit Tests for Schema Parser
 */

import { SchemaParser } from '../src/schema/schemaParser';

describe('SchemaParser', () => {
    test('selects the BTM-requested root from a multi-root schema', () => {
        const schema = `
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
              <xs:element name="First" type="xs:string"/>
              <xs:element name="Selected"><xs:complexType><xs:sequence>
                <xs:element name="Value" type="xs:string"/>
              </xs:sequence></xs:complexType></xs:element>
            </xs:schema>`;

        const tree = parser.parse(schema, 'multi-root.xsd', 'Selected');

        expect(tree.rootElement.name).toBe('Selected');
        expect(tree.rootElement.children[0].name).toBe('Value');
    });

    let parser: SchemaParser;

    beforeEach(() => {
        parser = new SchemaParser();
    });

    test('should parse a simple XSD with elements', () => {
        const xsd = `<?xml version="1.0" encoding="utf-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="http://test.com">
  <xs:element name="Root">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="Name" type="xs:string"/>
        <xs:element name="Age" type="xs:int"/>
        <xs:element name="Email" type="xs:string" minOccurs="0"/>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;

        const result = parser.parse(xsd, 'test.xsd');

        expect(result.targetNamespace).toBe('http://test.com');
        expect(result.rootElement.name).toBe('Root');
        expect(result.rootElement.children.length).toBe(3);
        expect(result.rootElement.children[0].name).toBe('Name');
        expect(result.rootElement.children[0].dataType).toBe('xs:string');
        expect(result.rootElement.children[1].name).toBe('Age');
        expect(result.rootElement.children[1].dataType).toBe('xs:int');
        expect(result.rootElement.children[2].name).toBe('Email');
        expect(result.rootElement.children[2].isOptional).toBe(true);
    });

    test('should parse nested complex types', () => {
        const xsd = `<?xml version="1.0" encoding="utf-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="Order">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="Header">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="OrderId" type="xs:string"/>
              <xs:element name="Date" type="xs:date"/>
            </xs:sequence>
          </xs:complexType>
        </xs:element>
        <xs:element name="Items">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="Item" maxOccurs="unbounded">
                <xs:complexType>
                  <xs:sequence>
                    <xs:element name="ProductName" type="xs:string"/>
                    <xs:element name="Quantity" type="xs:int"/>
                  </xs:sequence>
                </xs:complexType>
              </xs:element>
            </xs:sequence>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>`;

        const result = parser.parse(xsd, 'order.xsd');

        expect(result.rootElement.name).toBe('Order');
        expect(result.rootElement.children.length).toBe(2);
        
        const header = result.rootElement.children[0];
        expect(header.name).toBe('Header');
        expect(header.children.length).toBe(2);
        expect(header.children[0].name).toBe('OrderId');
        
        const items = result.rootElement.children[1];
        expect(items.children[0].name).toBe('Item');
        expect(items.children[0].maxOccurs).toBe('unbounded');
    });

    test('should parse attributes', () => {
        const xsd = `<?xml version="1.0" encoding="utf-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="Person">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="Name" type="xs:string"/>
      </xs:sequence>
      <xs:attribute name="id" type="xs:string" use="required"/>
      <xs:attribute name="active" type="xs:boolean" default="true"/>
    </xs:complexType>
  </xs:element>
</xs:schema>`;

        const result = parser.parse(xsd, 'person.xsd');

        expect(result.rootElement.attributes.length).toBe(2);
        expect(result.rootElement.attributes[0].name).toBe('id');
        expect(result.rootElement.attributes[0].required).toBe(true);
        expect(result.rootElement.attributes[1].name).toBe('active');
        expect(result.rootElement.attributes[1].defaultValue).toBe('true');
    });

    test('preserves numeric defaults, fixed values, and enumerations as strings', () => {
        const xsd = `<?xml version="1.0"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:element name="Root">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="Count" type="xs:int" default="0"/>
        <xs:element name="Code" fixed="101">
          <xs:simpleType>
            <xs:restriction base="xs:int">
              <xs:enumeration value="101"/>
              <xs:enumeration value="202"/>
            </xs:restriction>
          </xs:simpleType>
        </xs:element>
      </xs:sequence>
      <xs:attribute name="version" type="xs:int" fixed="1"/>
    </xs:complexType>
  </xs:element>
</xs:schema>`;

        const result = parser.parse(xsd, 'numeric-values.xsd');

        expect(result.rootElement.children[0].defaultValue).toBe('0');
        expect(result.rootElement.children[1].fixedValue).toBe('101');
        expect(result.rootElement.children[1].restrictions?.enumeration).toEqual(['101', '202']);
        expect(result.rootElement.attributes[0].fixedValue).toBe('1');
    });

    test('should throw on invalid XSD', () => {
        expect(() => parser.parse('<invalid>not a schema</invalid>', 'bad.xsd'))
            .toThrow('Invalid XSD: no schema root element found');
    });
});
