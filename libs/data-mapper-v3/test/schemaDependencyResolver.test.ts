import * as path from 'path';
import { resolveSchemaDependencies } from '../src/schema/schemaDependencyResolver';
import { SchemaParser } from '../src/schema/schemaParser';

describe('schema dependency resolution', () => {
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
