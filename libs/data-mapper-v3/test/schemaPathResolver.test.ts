import { SchemaParser } from '../src/schema/schemaParser';
import { SchemaPathResolver, simplifySchemaPath } from '../src/schema/schemaPathResolver';
import { BtmSerializer } from '../src/schema/btmSerializer';
import { InstanceGenerator } from '../src/schema/instanceGenerator';
import { XsltCompiler } from '../src/compiler/xsltCompiler';
import { DEFAULT_MAP_OPTIONS, FunctoidCategory, LinkEndpointType, type MapDocument, ParameterType } from '../src/model';
import { replaceSchema } from '../src/schema/schemaReplacement';
import { applyMapPatches, createMapPatchValidationContext } from '../src/copilot/mapPrompt';

const schemaXml = `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
  <xs:group name="Domestic"><xs:sequence><xs:element name="Code" type="xs:string"/></xs:sequence></xs:group>
  <xs:group name="Foreign"><xs:sequence><xs:element name="Code" type="xs:string"/></xs:sequence></xs:group>
  <xs:attributeGroup name="Inner"><xs:attribute name="Version" type="xs:string"/></xs:attributeGroup>
  <xs:attributeGroup name="Audit"><xs:attributeGroup ref="Inner"/></xs:attributeGroup>
  <xs:element name="Root"><xs:complexType><xs:sequence>
    <xs:sequence><xs:element name="Value" type="xs:string"/></xs:sequence>
    <xs:choice><xs:group ref="Domestic"/><xs:group ref="Foreign"/></xs:choice>
    <xs:element name="Attributes"><xs:complexType><xs:attributeGroup ref="Audit"/></xs:complexType></xs:element>
  </xs:sequence></xs:complexType></xs:element>
</xs:schema>`;

function makeMap(): MapDocument {
  return {
    name: 'Legacy groups',
    version: '2',
    sourceSchema: { location: 'source.xsd' },
    targetSchema: { location: 'target.xsd' },
    options: { ...DEFAULT_MAP_OPTIONS },
    pages: [
      {
        id: 'page1',
        name: 'Page 1',
        functoids: [],
        links: [
          {
            id: '1',
            sourceId: '/Root/<Sequence>/Value',
            sourcePath: '/Root/<Sequence>/Value',
            targetId: '/Root/<Choice>/<Group:Domestic>/Code',
            targetPath: '/Root/<Choice>/<Group:Domestic>/Code',
            sourceType: LinkEndpointType.SchemaNode,
            targetType: LinkEndpointType.SchemaNode,
          },
        ],
      },
    ],
  };
}

describe('legacy schema paths', () => {
  const tree = new SchemaParser().parse(schemaXml, 'schema.xsd');
  const resolver = new SchemaPathResolver(tree);

  test('resolves only structural aliases actually present in the schema', () => {
    expect(resolver.require('/Root/<Sequence>/Value').path).toBe('/Root/Value');
    expect(resolver.require('/Root/Value').path).toBe('/Root/Value');
    expect(resolver.resolve('/Root/<Choice>/Value')).toBeUndefined();
    expect(resolver.resolve('/Root/<Group:Missing>/Value')).toBeUndefined();
    expect(resolver.resolve('/Root/<Unknown>/Value')).toBeUndefined();
    expect(resolver.require('/Root/Attributes/<AttrGroup:Audit>/<AttrGroup:Inner>/@Version').attribute?.name).toBe('Version');
  });

  test('preserves duplicate branch identities and rejects ambiguous flattened paths', () => {
    const domestic = resolver.require('/Root/<Choice>/<Group:Domestic>/Code');
    const foreign = resolver.require('/Root/<Choice>/<Group:Foreign>/Code');
    expect(domestic.path).not.toBe(foreign.path);
    expect(resolver.require(domestic.path).node).toBe(domestic.node);
    expect(resolver.resolve('/Root/Code')).toBeUndefined();
    expect(resolver.resolve('/Root/<Choice>/Code')).toBeUndefined();
    expect(new SchemaPathResolver(JSON.parse(JSON.stringify(tree))).require('/Root/<Choice>/<Group:Foreign>/Code').path).toBe(foreign.path);
  });

  test('resolves all, repeated compositor positions and descendants', () => {
    const repeated = new SchemaParser().parse(
      `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="Root"><xs:complexType><xs:sequence>
            <xs:sequence><xs:element name="Item"><xs:complexType><xs:all><xs:element name="A" type="xs:string"/></xs:all></xs:complexType></xs:element></xs:sequence>
            <xs:sequence><xs:element name="Item"><xs:complexType><xs:sequence><xs:element name="B" type="xs:string"/></xs:sequence></xs:complexType></xs:element></xs:sequence>
          </xs:sequence></xs:complexType></xs:element>
        </xs:schema>`,
      'repeated.xsd'
    );
    const paths = new SchemaPathResolver(repeated);
    expect(paths.require('/Root/<Sequence>[1]/Item/<All>/A').node.name).toBe('A');
    expect(paths.require('/Root/<Sequence>[2]/Item/B').node.name).toBe('B');
    expect(paths.resolve('/Root/<Sequence>[1]/Item/B')).toBeUndefined();
    expect(paths.resolve('/Root/Item')).toBeUndefined();
    expect(paths.require('/Root/<Sequence>[2]/Item/B').path).toBe('/Root/Item[#2]/B');
  });

  test('keeps complete TOM predicates and rejects incomplete decoding', () => {
    const raw =
      "/*[local-name()='<Schema>']/*[local-name()='Root']/*[local-name()='<Sequence>' and position()='2']/*[local-name()='Value']";
    expect(simplifySchemaPath(raw)).toBe('/Root/<Sequence>[2]/Value');
    const separatePosition =
      "/*[local-name()='<Schema>']/*[namespace-uri()='urn:test' and local-name()='Root']/*[local-name()='<Sequence>'][position()='2']/*[local-name()='Value']";
    expect(simplifySchemaPath(separatePosition)).toBe('/Root/<Sequence>[2]/Value');
    const invalid = "/*[local-name()='Root']/unsupported/*[local-name()='Value']";
    expect(simplifySchemaPath(invalid)).toBe(invalid);
    expect(resolver.resolve(invalid)).toBeUndefined();
    expect(resolver.resolve("/*[local-name()='Root' and namespace-uri()='wrong']/*[local-name()='Value']")).toBeUndefined();
  });

  test.each(['<Schema>', '<schema>'])('resolves the %s wrapper without making element names case-insensitive', (wrapper) => {
    const raw = `/*[local-name()='${wrapper}']/*[local-name()='Root']/*[local-name()='Value']`;
    expect(simplifySchemaPath(raw)).toBe('/Root/Value');
    expect(resolver.require(raw).path).toBe('/Root/Value');
    expect(resolver.resolve(raw.replace("'Root'", "'root'"))).toBeUndefined();
  });

  test.each(['<Schema>', '<schema>'])('round-trips original %s endpoint and value paths through repeated saves', (wrapper) => {
    const serializer = new BtmSerializer();
    const raw = `/*[local-name()='${wrapper}']/*[local-name()='Root']/*[local-name()='<Sequence>']/*[local-name()='Value']`;
    const escaped = raw.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const btm = `<mapsource Name="Legacy"><SrcTree/><TrgTree/><TreeValues>
          <TestValues><Value Query="${escaped}" value="sample"/></TestValues>
          <ConstantValues><Value Query="${escaped}" value="constant"/></ConstantValues></TreeValues>
          <Pages><Page Name="Page"><Links><Link LinkID="1" LinkFrom="${escaped}" LinkTo="${escaped}"/></Links></Page></Pages></mapsource>`;
    let map = serializer.deserialize(btm);
    for (let i = 0; i < 3; i++) {
      const saved = serializer.serialize(map);
      expect(saved).toContain(`SourcePath="${escaped}"`);
      expect(saved).toContain(`TargetPath="${escaped}"`);
      map = serializer.deserialize(saved);
      expect(map.pages[0].links).toHaveLength(1);
      expect(map.testValues).toEqual({ [raw]: 'sample' });
      expect(map.targetValues).toEqual({ [raw]: 'constant' });
    }
    map.pages[0].links[0].targetPath = '/Root/Changed';
    map.pages[0].links[0].targetId = '/Root/Changed';
    expect(serializer.serialize(map)).toContain('TargetPath="/Root/Changed"');
  });

  test('compiles the selected branch and constants without mutating persisted paths', () => {
    const map = makeMap();
    map.targetValues = { '/Root/Attributes/<AttrGroup:Audit>/<AttrGroup:Inner>/@Version': 'fixed' };
    const before = JSON.stringify(map);
    const result = new XsltCompiler().compile(map, tree, tree);
    expect(result.errors).toEqual([]);
    expect(result.success).toBe(true);
    expect(result.xslt?.match(/<Code>/g)).toHaveLength(1);
    expect(result.xslt).toContain('fixed');
    expect(result.xslt).not.toContain('[#');
    expect(result.xslt).not.toContain('&lt;Sequence');
    expect(JSON.stringify(map)).toBe(before);
    map.pages[0].links[0].targetPath = '/Root/Code';
    expect(new XsltCompiler().compile(map, tree, tree).errors.some((error) => /ambiguous/.test(error.message))).toBe(true);
  });

  test('uses aliases for sample values, replacement and patch validation', () => {
    const xml = new InstanceGenerator().generate(tree, {
      '/Root/<Sequence>/Value': 'test & value',
      '/Root/Attributes/<AttrGroup:Audit>/<AttrGroup:Inner>/@Version': 'v2',
    });
    expect(xml).toContain('<Value>test &amp; value</Value>');
    expect(xml).toContain('Version="v2"');
    expect(() => new InstanceGenerator().generate(tree, { '/Root/Missing': 'bad' })).toThrow(/Unresolved/);
    const map = makeMap();
    expect(replaceSchema(map, 'target', tree, map.targetSchema).removedLinkCount).toBe(0);
    expect(() =>
      applyMapPatches(map, [{ op: 'replace', path: '/name', value: 'Renamed' }], createMapPatchValidationContext(tree, tree, []))
    ).not.toThrow();
  });

  test('treats a group of fields as one choice branch and preserves nested choices', () => {
    const schema = new SchemaParser().parse(
      `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="Root"><xs:complexType><xs:choice>
            <xs:sequence><xs:element name="A" type="xs:string"/><xs:choice>
              <xs:element name="B" type="xs:string"/><xs:element name="C" type="xs:string"/>
            </xs:choice></xs:sequence>
            <xs:element name="D" type="xs:string"/>
          </xs:choice></xs:complexType></xs:element>
        </xs:schema>`,
      'choices.xsd'
    );
    const map = makeMap();
    map.pages[0].links = [];
    map.targetValues = { '/Root/A': 'a', '/Root/B': 'b' };
    expect(new XsltCompiler().compile(map, schema, schema).errors).toEqual([]);
    map.targetValues['/Root/C'] = 'c';
    let result = new XsltCompiler().compile(map, schema, schema);
    expect(result.errors.some((error) => /multiple branches/.test(error.message))).toBe(false);
    expect(result.warnings.some((warning) => /may generate multiple branches/.test(warning.message))).toBe(true);
    delete map.targetValues['/Root/C'];
    map.targetValues['/Root/D'] = 'd';
    result = new XsltCompiler().compile(map, schema, schema);
    expect(result.errors.some((error) => /multiple branches/.test(error.message))).toBe(false);
    expect(result.warnings.some((warning) => /may generate multiple branches/.test(warning.message))).toBe(true);
    map.targetValues = {};
    map.pages[0].functoids = ['conditionalA', 'conditionalD'].map((id, index) => ({
      id,
      functoidId: 375,
      category: FunctoidCategory.Logical,
      name: 'Value Mapping',
      x: 0,
      y: index * 50,
      inputLinks: [],
      outputLinks: [],
      parameters: [
        { index: 0, type: ParameterType.Constant, value: index === 0 ? 'true' : 'false' },
        { index: 1, type: ParameterType.Constant, value: id },
      ],
    }));
    map.pages[0].links = [
      {
        id: 'conditional-a',
        sourceId: 'conditionalA',
        targetId: '/Root/A',
        targetPath: '/Root/A',
        sourceType: LinkEndpointType.Functoid,
        targetType: LinkEndpointType.SchemaNode,
      },
      {
        id: 'conditional-d',
        sourceId: 'conditionalD',
        targetId: '/Root/D',
        targetPath: '/Root/D',
        sourceType: LinkEndpointType.Functoid,
        targetType: LinkEndpointType.SchemaNode,
      },
    ];
    result = new XsltCompiler().compile(map, schema, schema);
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings.some((warning) => /conditionally mapped branches/.test(warning.message))).toBe(true);
    const xml = new InstanceGenerator().generate(schema);
    expect(xml).toContain('<A>');
    expect(xml).toContain('<B>');
    expect(xml).not.toContain('<C>');
    expect(xml).not.toContain('<D>');
  });

  test('rejects unsupported old-format maps instead of silently dropping their links', () => {
    expect(() =>
      new BtmSerializer().deserialize('<mapsource name="Old"><srctree/><sinktree/><links><link/></links><functions/></mapsource>')
    ).toThrow(/Unsupported legacy BTM format/);
    expect(() => new BtmSerializer().deserialize('<mapsource><Pages></mapsource>')).toThrow(/Invalid .btm XML/);
  });
});
