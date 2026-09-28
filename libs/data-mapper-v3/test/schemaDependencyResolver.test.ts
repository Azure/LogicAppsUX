import * as path from 'path';
import { resolveSchemaDependencies } from '../src/schema/schemaDependencyResolver';
import { SchemaParser } from '../src/schema/schemaParser';

describe('schema dependency resolution', () => {
    test.each(['xs', 'xsd', 'q1', ''])('parses schema constructs with the %j prefix', (prefix) => {
        const tag = prefix ? `${prefix}:` : '';
        const declaration = prefix ? `xmlns:${prefix}` : 'xmlns';
        const typeNamespace = prefix === 'xs' ? '' : 'xmlns:xs="http://www.w3.org/2001/XMLSchema"';
        const xml = `<${tag}schema ${declaration}="http://www.w3.org/2001/XMLSchema"
            ${typeNamespace} xmlns:t="urn:test" targetNamespace="urn:test">
          <${tag}element name="Leaf" type="xs:string"/>
          <${tag}element name="Root"><${tag}annotation><${tag}documentation>Root documentation</${tag}documentation></${tag}annotation>
            <${tag}complexType><${tag}sequence>
              <${tag}element ref="t:Leaf"/>
              <${tag}element name="Code"><${tag}simpleType><${tag}restriction base="xs:string">
                <${tag}maxLength value="5"/>
              </${tag}restriction></${tag}simpleType></${tag}element>
            </${tag}sequence></${tag}complexType>
          </${tag}element>
        </${tag}schema>`;
        const tree = new SchemaParser().parse(xml, 'prefixed.xsd', 'Root');
        expect(tree.rootElement.name).toBe('Root');
        expect(tree.rootElement.annotation).toBe('Root documentation');
        expect(tree.rootElement.children.map(node => node.name)).toEqual(['Leaf', 'Code']);
        expect(tree.rootElement.children[0].namespace).toBe('urn:test');
        expect(tree.rootElement.children[1].restrictions?.maxLength).toBe(5);
        expect(() => new SchemaParser().parse(xml, 'prefixed.xsd', 'Missing'))
            .toThrow("root element 'Missing' was not found");
    });

    test('loads a q1:schema document with xs children and a differently prefixed imported schema', async () => {
        const rootPath = path.resolve('schemas', 'prefixed.xsd');
        const xml = `<q1:schema xmlns:q1="http://www.w3.org/2001/XMLSchema"
            xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:imp="urn:imported">
          <xs:import namespace="urn:imported" schemaLocation="imported.xsd"/>
          <xs:element name="Root"><xs:complexType><xs:sequence>
            <xs:element ref="imp:Leaf"/>
          </xs:sequence></xs:complexType></xs:element>
        </q1:schema>`;
        const imported = `<other:schema xmlns:other="http://www.w3.org/2001/XMLSchema"
            targetNamespace="urn:imported">
          <other:element name="Leaf"><other:complexType><other:sequence>
            <other:element name="Value" type="other:string"/>
          </other:sequence></other:complexType></other:element>
        </other:schema>`;
        const dependencies = await resolveSchemaDependencies(
            xml, rootPath, async () => imported,
            (containingPath, location) => path.resolve(path.dirname(containingPath), location)
        );
        const tree = new SchemaParser().parseWithImports(xml, rootPath, dependencies);
        expect(tree.rootElement.children[0].name).toBe('Leaf');
        expect(tree.rootElement.children[0].children[0].name).toBe('Value');
        expect(tree.rootElement.children[0].namespace).toBe('urn:imported');
    });

    test('resolves element-local type and ref prefixes without leaking overrides to siblings', async () => {
        const rootPath = path.resolve('schemas', 'root.xsd');
        const imported = `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="urn:imported"
            elementFormDefault="qualified">
          <xs:complexType name="Record"><xs:sequence><xs:element name="Value" type="xs:string"/></xs:sequence></xs:complexType>
          <xs:simpleType name="Code"><xs:restriction base="xs:string"><xs:maxLength value="10"/></xs:restriction></xs:simpleType>
          <xs:element name="Leaf" type="xs:string"/>
        </xs:schema>`;
        const root = `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
            xmlns:q="urn:root" targetNamespace="urn:root">
          <xs:import namespace="urn:imported" schemaLocation="imported.xsd"/>
          <xs:complexType name="Record"><xs:sequence><xs:element name="LocalValue" type="xs:string"/></xs:sequence></xs:complexType>
          <xs:element name="Root"><xs:complexType><xs:sequence>
            <xs:element xmlns:q="urn:imported" name="Imported" type="q:Record"/>
            <xs:element xmlns:new="urn:imported" name="NewPrefix" type="new:Record"/>
            <xs:element xmlns:q="urn:imported" name="Container"><xs:complexType><xs:sequence>
              <xs:element name="Inherited" type="q:Record"/>
            </xs:sequence></xs:complexType></xs:element>
            <xs:element xmlns:q="urn:imported" ref="q:Leaf"/>
            <xs:element xmlns:q="urn:imported" name="Code" type="q:Code"/>
            <xs:element name="Local" type="q:Record"/>
          </xs:sequence></xs:complexType></xs:element>
        </xs:schema>`;
        const dependencies = await resolveSchemaDependencies(
            root, rootPath, async () => imported,
            (containingPath, location) => path.resolve(path.dirname(containingPath), location)
        );
        const tree = new SchemaParser().parseWithImports(root, rootPath, dependencies);
        const [overridden, newPrefix, container, ref, code, sibling] = tree.rootElement.children;
        expect(overridden.children.map(node => node.name)).toEqual(['Value']);
        expect(overridden.dataTypeNamespace).toBe('urn:imported');
        expect(newPrefix.children.map(node => node.name)).toEqual(['Value']);
        expect(container.children[0].children.map(node => node.name)).toEqual(['Value']);
        expect(ref.name).toBe('Leaf');
        expect(ref.namespace).toBe('urn:imported');
        expect(code.restrictions?.maxLength).toBe(10);
        expect(sibling.children.map(node => node.name)).toEqual(['LocalValue']);
        expect(sibling.dataTypeNamespace).toBe('urn:root');
    });

    test('loads imports and includes recursively and resolves QNames by namespace', async () => {
        const rootPath = path.resolve('schemas', 'root.xsd');
        const files = new Map<string, string>([
            [path.resolve('schemas', 'imported.xsd'), `
                <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                           xmlns:leaf="urn:leaf" targetNamespace="urn:imported">
                  <xs:import namespace="urn:leaf" schemaLocation="nested/leaf.xsd"/>
                  <xs:complexType name="ImportedType"><xs:sequence>
                    <xs:element ref="leaf:Leaf"/>
                  </xs:sequence></xs:complexType>
                </xs:schema>`],
            [path.resolve('schemas', 'nested', 'leaf.xsd'), `
                <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                           targetNamespace="urn:leaf">
                  <xs:element name="Leaf" type="xs:string"/>
                </xs:schema>`],
            [path.resolve('schemas', 'included.xsd'), `
                <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                           elementFormDefault="qualified">
                  <xs:complexType name="IncludedType"><xs:sequence>
                    <xs:element name="IncludedValue" type="xs:string"/>
                  </xs:sequence></xs:complexType>
                </xs:schema>`]
        ]);
        const root = `
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
                       xmlns:imp="urn:imported" xmlns:tns="urn:root"
                       targetNamespace="urn:root">
              <xs:import namespace="urn:imported" schemaLocation="imported.xsd"/>
              <xs:include schemaLocation="included.xsd"/>
              <xs:element name="Root"><xs:complexType><xs:sequence>
                <xs:element name="Imported" type="imp:ImportedType"/>
                <xs:element name="Included" type="tns:IncludedType"/>
              </xs:sequence></xs:complexType></xs:element>
            </xs:schema>`;

        const dependencies = await resolveSchemaDependencies(
            root,
            rootPath,
            async dependencyPath => files.get(path.resolve(dependencyPath)),
            (containingPath, location) =>
                path.resolve(path.dirname(containingPath), location)
        );
        const tree = new SchemaParser().parseWithImports(root, rootPath, dependencies);

        expect(dependencies.size).toBe(3);
        expect(tree.rootElement.children[0].children[0].name).toBe('Leaf');
        expect(tree.rootElement.children[0].children[0].namespace).toBe('urn:leaf');
        expect(tree.rootElement.children[1].children[0].name).toBe('IncludedValue');
        expect(tree.rootElement.children[1].children[0].namespace).toBe('urn:root');
    });

    test('reports an unresolved dependency explicitly', async () => {
        const root = `
            <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
              <xs:include schemaLocation="missing.xsd"/>
              <xs:element name="Root" type="xs:string"/>
            </xs:schema>`;

        await expect(resolveSchemaDependencies(
            root,
            path.resolve('schemas', 'root.xsd'),
            async () => undefined,
            (containingPath, location) =>
                path.resolve(path.dirname(containingPath), location)
        )).rejects.toThrow("Could not resolve schema dependency 'missing.xsd'");
    });
});
