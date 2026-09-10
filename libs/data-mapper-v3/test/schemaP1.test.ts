import { SchemaParser } from '../src/schema/schemaParser';
import { XMLParser } from 'fast-xml-parser';
import { InstanceGenerator } from '../src/schema/instanceGenerator';
import { XMLValidator } from 'fast-xml-parser';

describe('SchemaParser P1 metadata', () => {
    test('retains choice, nil/default, namespace, attribute, and inheritance metadata', () => {
        const tree = new SchemaParser().parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:tns="urn:test"
                       targetNamespace="urn:test" elementFormDefault="qualified"
                       attributeFormDefault="qualified">
              <xs:complexType name="Base">
                <xs:sequence><xs:element name="BaseValue" type="xs:string"/></xs:sequence>
              </xs:complexType>
              <xs:complexType name="Derived">
                <xs:complexContent><xs:extension base="tns:Base">
                  <xs:choice>
                    <xs:element name="A" type="xs:string"/>
                    <xs:element name="B" type="xs:string"/>
                  </xs:choice>
                  <xs:attribute name="Code" type="xs:string" fixed="code"/>
                </xs:extension></xs:complexContent>
              </xs:complexType>
              <xs:element name="Root" type="tns:Derived" nillable="true" default="default"/>
            </xs:schema>`, 'schema');

        expect(tree.rootElement.namespace).toBe('urn:test');
        expect(tree.rootElement.nillable).toBe(true);
        expect(tree.rootElement.defaultValue).toBe('default');
        expect(tree.rootElement.baseType).toBe('tns:Base');
        expect(tree.rootElement.dataTypeNamespace).toBe('urn:test');
        expect(tree.rootElement.children.map(child => child.name)).toEqual(['BaseValue', 'A', 'B']);
        expect(tree.rootElement.children[1].choiceGroup).toBe(tree.rootElement.children[2].choiceGroup);
        expect(tree.rootElement.attributes[0]).toMatchObject({
            name: 'Code',
            fixedValue: 'code',
            namespace: 'urn:test'
        });
    });

    test('expands nested groups, attribute groups, and attribute references', () => {
        const tree = new SchemaParser().parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                       xmlns:tns="urn:test" targetNamespace="urn:test"
                       elementFormDefault="qualified" attributeFormDefault="qualified">
              <xs:attribute name="GlobalCode" type="xs:string" fixed="global"/>
              <xs:attributeGroup name="Audit">
                <xs:attribute ref="tns:GlobalCode" use="required"/>
                <xs:attribute name="Version" type="xs:int"/>
              </xs:attributeGroup>
              <xs:group name="Names">
                <xs:sequence><xs:element name="Name" type="xs:string"/></xs:sequence>
              </xs:group>
              <xs:group name="Details">
                <xs:sequence>
                  <xs:element name="Before" type="xs:string"/>
                  <xs:group ref="tns:Names"/>
                  <xs:element name="Description" type="xs:string"/>
                </xs:sequence>
              </xs:group>
              <xs:complexType name="RootType">
                <xs:group ref="tns:Details" minOccurs="0" maxOccurs="unbounded"/>
                <xs:attributeGroup ref="tns:Audit"/>
                <xs:anyAttribute namespace="##other" processContents="lax"/>
              </xs:complexType>
              <xs:element name="Root" type="tns:RootType"/>
            </xs:schema>`, 'groups.xsd');

        expect(tree.rootElement.children.map(child => child.name))
            .toEqual(['Before', 'Name', 'Description']);
        expect(tree.rootElement.children[1]).toMatchObject({
            minOccurs: 0,
            maxOccurs: 'unbounded',
            isOptional: true
        });
        expect(tree.rootElement.attributes).toEqual(expect.arrayContaining([
            expect.objectContaining({
                name: 'GlobalCode',
                required: true,
                fixedValue: 'global',
                namespace: 'urn:test'
            }),
            expect.objectContaining({ name: 'Version', type: 'xs:int' }),
            expect.objectContaining({
                name: '*',
                wildcard: {
                    namespaceConstraint: '##other',
                    processContents: 'lax'
                }
            })
        ]));
    });

    test('supports simple content and complex-content restrictions', () => {
        const tree = new SchemaParser().parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                       xmlns:tns="urn:test" targetNamespace="urn:test">
              <xs:complexType name="Amount">
                <xs:simpleContent><xs:restriction base="xs:decimal">
                  <xs:minInclusive value="0"/>
                  <xs:maxExclusive value="1000"/>
                  <xs:fractionDigits value="2"/>
                  <xs:attribute name="currency" type="xs:string" use="required"/>
                </xs:restriction></xs:simpleContent>
              </xs:complexType>
              <xs:complexType name="AmountWithUnit">
                <xs:simpleContent><xs:extension base="tns:Amount">
                  <xs:attribute name="unit" type="xs:string"/>
                </xs:extension></xs:simpleContent>
              </xs:complexType>
              <xs:complexType name="Base">
                <xs:sequence>
                  <xs:element name="Keep" type="xs:string"/>
                  <xs:element name="Remove" type="xs:string"/>
                </xs:sequence>
                <xs:attribute name="old" type="xs:string"/>
              </xs:complexType>
              <xs:complexType name="Restricted">
                <xs:complexContent><xs:restriction base="tns:Base">
                  <xs:sequence><xs:element name="Keep" type="xs:string"/></xs:sequence>
                  <xs:attribute name="old" use="prohibited"/>
                </xs:restriction></xs:complexContent>
              </xs:complexType>
              <xs:element name="Root">
                <xs:complexType><xs:sequence>
                  <xs:element name="Amount" type="tns:Amount"/>
                  <xs:element name="AmountWithUnit" type="tns:AmountWithUnit"/>
                  <xs:element name="Restricted" type="tns:Restricted"/>
                </xs:sequence></xs:complexType>
              </xs:element>
            </xs:schema>`, 'derivation.xsd');

        const amount = tree.rootElement.children[0];
        expect(amount.dataType).toBe('xs:decimal');
        expect(amount.restrictions).toMatchObject({
            baseType: 'xs:decimal',
            minInclusive: 0,
            maxExclusive: 1000,
            fractionDigits: 2
        });
        expect(amount.attributes[0]).toMatchObject({
            name: 'currency',
            required: true
        });
        const amountWithUnit = tree.rootElement.children[1];
        expect(amountWithUnit.dataType).toBe('xs:decimal');
        expect(amountWithUnit.attributes.map(attribute => attribute.name))
            .toEqual(['currency', 'unit']);
        const restricted = tree.rootElement.children[2];
        expect(restricted.children.map(child => child.name)).toEqual(['Keep']);
        expect(restricted.attributes).toEqual([]);
    });

    test('retains substitutions, wildcards, lists, unions, and all restriction facets', () => {
        const tree = new SchemaParser().parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                       xmlns:tns="urn:test" targetNamespace="urn:test"
                       elementFormDefault="qualified">
              <xs:element name="Item" type="xs:string" abstract="true"/>
              <xs:element name="Book" type="xs:string" substitutionGroup="tns:Item"/>
              <xs:element name="Video" type="xs:string" substitutionGroup="tns:Item"/>
              <xs:simpleType name="Codes"><xs:list itemType="xs:NMTOKEN"/></xs:simpleType>
              <xs:simpleType name="Identifier">
                <xs:union memberTypes="xs:int xs:string">
                  <xs:simpleType><xs:restriction base="xs:string">
                    <xs:pattern value="[A-Z]+"/>
                  </xs:restriction></xs:simpleType>
                </xs:union>
              </xs:simpleType>
              <xs:simpleType name="Bounded">
                <xs:restriction base="xs:decimal">
                  <xs:length value="3"/><xs:minLength value="2"/><xs:maxLength value="4"/>
                  <xs:minExclusive value="1"/><xs:maxInclusive value="9"/>
                  <xs:totalDigits value="3"/><xs:fractionDigits value="1"/>
                  <xs:whiteSpace value="collapse"/>
                </xs:restriction>
              </xs:simpleType>
              <xs:element name="Root">
                <xs:complexType><xs:sequence>
                  <xs:element ref="tns:Item"/>
                  <xs:element name="Codes" type="tns:Codes"/>
                  <xs:element name="Identifier" type="tns:Identifier"/>
                  <xs:element name="Bounded" type="tns:Bounded"/>
                  <xs:any namespace="##other" processContents="skip"
                          minOccurs="0" maxOccurs="unbounded"/>
                </xs:sequence></xs:complexType>
              </xs:element>
            </xs:schema>`, 'advanced.xsd', 'Root');

        const [item, codes, identifier, bounded, wildcard] =
            tree.rootElement.children;
        expect(item.substitutionMembers?.map(member => member.name))
            .toEqual(['Book', 'Video']);
        expect(codes).toMatchObject({
            dataType: 'xs:list',
            restrictions: { listItemType: 'xs:NMTOKEN' }
        });
        expect(identifier).toMatchObject({
            dataType: 'xs:union',
            restrictions: {
                unionMemberTypes: ['xs:int', 'xs:string', '#inline1']
            }
        });
        expect(bounded.restrictions).toMatchObject({
            baseType: 'xs:decimal',
            length: 3,
            minLength: 2,
            maxLength: 4,
            minExclusive: 1,
            maxInclusive: 9,
            totalDigits: 3,
            fractionDigits: 1,
            whiteSpace: 'collapse'
        });
        expect(wildcard).toMatchObject({
            name: '*',
            type: 'any',
            minOccurs: 0,
            maxOccurs: 'unbounded',
            wildcard: {
                namespaceConstraint: '##other',
                processContents: 'skip'
            }
        });
    });

    test('handles bare wildcards and does not emit wildcard attributes literally', () => {
        const tree = new SchemaParser().parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
              <xs:element name="Root"><xs:complexType>
                <xs:sequence><xs:any/></xs:sequence>
                <xs:anyAttribute/>
              </xs:complexType></xs:element>
            </xs:schema>`, 'wildcard.xsd');

        expect(tree.rootElement.children[0]).toMatchObject({
            name: '*',
            wildcard: { processContents: 'strict' }
        });
        expect(tree.rootElement.attributes[0]).toMatchObject({
            name: '*',
            wildcard: { processContents: 'strict' }
        });
        const instance = new InstanceGenerator().generate(tree);
        expect(instance).not.toContain('*=');
        expect(XMLValidator.validate(instance)).toBe(true);
    });

    test('combines group and child occurrence constraints', () => {
        const tree = new SchemaParser().parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                       xmlns:tns="urn:test" targetNamespace="urn:test">
              <xs:group name="Values"><xs:sequence>
                <xs:element name="Value" minOccurs="0" maxOccurs="3"/>
              </xs:sequence></xs:group>
              <xs:element name="Root"><xs:complexType>
                <xs:group ref="tns:Values" minOccurs="2" maxOccurs="4"/>
              </xs:complexType></xs:element>
            </xs:schema>`, 'occurrences.xsd');

        expect(tree.rootElement.children[0]).toMatchObject({
            minOccurs: 0,
            maxOccurs: 12,
            isOptional: true
        });
    });

    test('does not attach substitutions to unrelated local elements', () => {
        const tree = new SchemaParser().parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                       xmlns:tns="urn:test" targetNamespace="urn:test">
              <xs:element name="Item" type="xs:string"/>
              <xs:element name="Special" type="xs:string" substitutionGroup="tns:Item"/>
              <xs:element name="Root"><xs:complexType><xs:sequence>
                <xs:element name="Item" type="xs:string"/>
              </xs:sequence></xs:complexType></xs:element>
            </xs:schema>`, 'local-substitution.xsd', 'Root');

        expect(tree.rootElement.children[0].substitutionMembers).toBeUndefined();
    });

    test('resolves imported groups, attributes, and substitution members by QName', () => {
        const importedXml = `
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                       xmlns:common="urn:common" targetNamespace="urn:common"
                       elementFormDefault="qualified">
              <xs:attribute name="Code" type="xs:string"/>
              <xs:group name="Content">
                <xs:sequence><xs:element name="Value" type="xs:string"/></xs:sequence>
              </xs:group>
              <xs:element name="Head" type="xs:string"/>
              <xs:element name="Member" type="xs:string"
                          substitutionGroup="common:Head"/>
            </xs:schema>`;
        const parsedImport = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_'
        }).parse(importedXml)['xs:schema'];
        const imports = new Map<string, any>([['common.xsd', parsedImport]]);
        const tree = new SchemaParser().parseWithImports(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                       xmlns:common="urn:common" targetNamespace="urn:root">
              <xs:import namespace="urn:common" schemaLocation="common.xsd"/>
              <xs:element name="Root">
                <xs:complexType>
                  <xs:group ref="common:Content"/>
                  <xs:attribute ref="common:Code"/>
                </xs:complexType>
              </xs:element>
            </xs:schema>`, 'root.xsd', imports);

        expect(tree.rootElement.children[0]).toMatchObject({
            name: 'Value',
            namespace: 'urn:common'
        });
        expect(tree.rootElement.attributes[0]).toMatchObject({
            name: 'Code',
            namespace: 'urn:common'
        });

        const importedTree = new SchemaParser().parseWithImports(
            importedXml,
            'common.xsd',
            imports,
            'Head'
        );
        expect(importedTree.rootElement.substitutionMembers)
            .toEqual([expect.objectContaining({ name: 'Member' })]);
    });

    test('stops recursive type and group expansion without overflowing', () => {
        const tree = new SchemaParser().parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                       xmlns:tns="urn:test" targetNamespace="urn:test">
              <xs:group name="Recursive">
                <xs:sequence>
                  <xs:element name="Value" type="xs:string"/>
                  <xs:group ref="tns:Recursive" minOccurs="0"/>
                </xs:sequence>
              </xs:group>
              <xs:complexType name="Node">
                <xs:sequence>
                  <xs:element name="Name" type="xs:string"/>
                  <xs:element name="Child" type="tns:Node" minOccurs="0"/>
                </xs:sequence>
              </xs:complexType>
              <xs:element name="Root">
                <xs:complexType><xs:sequence>
                  <xs:group ref="tns:Recursive"/>
                  <xs:element name="Node" type="tns:Node"/>
                </xs:sequence></xs:complexType>
              </xs:element>
            </xs:schema>`, 'recursive.xsd');

        expect(tree.rootElement.children.map(child => child.name))
            .toEqual(['Value', 'Node']);
        expect(tree.rootElement.children[1].children.map(child => child.name))
            .toEqual(['Name', 'Child']);
        expect(tree.rootElement.children[1].children[1].children).toEqual([]);
    });

    test('stops recursive global element references without overflowing', () => {
        const tree = new SchemaParser().parse(`
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                       xmlns:tns="urn:test" targetNamespace="urn:test">
              <xs:element name="Root">
                <xs:complexType><xs:sequence>
                  <xs:element ref="tns:Root" minOccurs="0"/>
                </xs:sequence></xs:complexType>
              </xs:element>
            </xs:schema>`, 'recursive-ref.xsd');

        expect(tree.rootElement.children[0]).toMatchObject({
            name: 'Root',
            minOccurs: 0,
            isOptional: true
        });
        expect(tree.rootElement.children[0].children[0].children).toEqual([]);
    });
});
