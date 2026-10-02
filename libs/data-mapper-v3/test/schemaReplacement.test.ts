import { DEFAULT_MAP_OPTIONS, FunctoidCategory, LinkEndpointType, type MapDocument, ParameterType } from '../src/model/mapModel';
import { SchemaParser } from '../src/schema/schemaParser';
import { replaceSchema } from '../src/schema/schemaReplacement';
import { BtmSerializer } from '../src/schema/btmSerializer';

const schema = new SchemaParser().parse(
  '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Root"><xs:complexType><xs:sequence><xs:element name="Keep" type="xs:string"/></xs:sequence><xs:attribute name="id" type="xs:string"/></xs:complexType></xs:element></xs:schema>',
  'new.xsd'
);

function replacementFixture(): MapDocument {
  return {
    name: 'Replacement',
    version: '1',
    sourceSchema: { location: '' },
    targetSchema: { location: '' },
    options: { ...DEFAULT_MAP_OPTIONS },
    targetValues: { '/Root/Keep': 'constant' },
    pages: [0, 1].map((index) => ({
      id: `p${index}`,
      name: `Page ${index}`,
      links: [
        {
          id: 'keep',
          sourceId: '/Root/Keep',
          targetId: '/Root/Keep',
          sourceType: LinkEndpointType.SchemaNode,
          targetType: LinkEndpointType.SchemaNode,
        },
        {
          id: 'attribute',
          sourceId: '/Root/@id',
          targetId: '/Root/@id',
          sourceType: LinkEndpointType.SchemaNode,
          targetType: LinkEndpointType.SchemaNode,
        },
        {
          id: 'input',
          sourceId: '/Root/Missing',
          targetId: 'f',
          sourceType: LinkEndpointType.SchemaNode,
          targetType: LinkEndpointType.Functoid,
        },
        {
          id: 'output',
          sourceId: 'f',
          targetId: '/Root/Missing',
          sourceType: LinkEndpointType.Functoid,
          targetType: LinkEndpointType.SchemaNode,
        },
        { id: 'internal', sourceId: 'f', targetId: 'g', sourceType: LinkEndpointType.Functoid, targetType: LinkEndpointType.Functoid },
      ],
      functoids: [
        {
          id: 'f',
          functoidId: 107,
          category: FunctoidCategory.String,
          name: 'Concatenate',
          x: 40,
          y: 50,
          inputLinks: ['input'],
          outputLinks: ['output', 'internal'],
          parameters: [
            { index: 0, type: ParameterType.Link, value: 'input' },
            { index: 1, type: ParameterType.Constant, value: 'input', guid: 'retained' },
          ],
        },
        {
          id: 'g',
          functoidId: 107,
          category: FunctoidCategory.String,
          name: 'Other',
          x: 140,
          y: 150,
          inputLinks: ['internal'],
          outputLinks: [],
          parameters: [{ index: 3, type: ParameterType.Link, value: 'internal' }],
        },
      ],
    })),
  };
}

describe('schema replacement reconciliation', () => {
  test.each(['source', 'target'] as const)('reconciles %s on every page without mutating the original', (side) => {
    const original = replacementFixture();
    const snapshot = JSON.stringify(original);
    const result = replaceSchema(original, side, schema, { location: 'new.xsd' });
    expect(result.removedLinkCount).toBe(2);
    expect(JSON.stringify(original)).toBe(snapshot);
    expect(result.map[`${side}Schema`]).toEqual({ location: 'new.xsd' });
    expect(result.map[side === 'source' ? 'targetSchema' : 'sourceSchema']).toBe(
      original[side === 'source' ? 'targetSchema' : 'sourceSchema']
    );
    expect(result.map.targetValues).toBe(original.targetValues);
    for (const [index, page] of result.map.pages.entries()) {
      expect(page.links.map((link) => link.id)).toEqual(['keep', 'attribute', side === 'source' ? 'output' : 'input', 'internal']);
      expect(page.functoids).toHaveLength(2);
      expect(page.functoids[1]).toBe(original.pages[index].functoids[1]);
      expect(page.functoids[0].x).toBe(40);
      expect(page.functoids[0].inputLinks).toEqual(side === 'source' ? [] : ['input']);
      expect(page.functoids[0].outputLinks).toEqual(side === 'source' ? ['output', 'internal'] : ['internal']);
      expect(page.functoids[0].parameters).toEqual(
        side === 'source'
          ? [{ index: 0, type: ParameterType.Constant, value: 'input', guid: 'retained' }]
          : original.pages[index].functoids[0].parameters
      );
    }
  });

  test('uses explicit paths before IDs and preserves untouched pages even with repeated link IDs', () => {
    const map = replacementFixture();
    map.pages[0].links[2].sourcePath = '/Root/Keep';
    const result = replaceSchema(map, 'source', schema, { location: 'new.xsd' });
    expect(result.removedLinkCount).toBe(1);
    expect(result.map.pages[0]).toBe(map.pages[0]);
    expect(result.map.pages[1].links.some((link) => link.id === 'input')).toBe(false);
  });

  test.each(['source', 'target'] as const)('serializes an untouched inline %s schema when the other side is replaced', (side) => {
    const serializer = new BtmSerializer();
    const map = replacementFixture();
    map[`${side}Schema`] = {
      location: '',
      rootName: 'Root',
      namespace: 'urn:original',
      inlineSchemaXml:
        '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="urn:original"><xs:element name="Root" type="xs:string"/></xs:schema>',
    };
    const result = replaceSchema(map, side === 'source' ? 'target' : 'source', schema, { location: 'new.xsd' });
    const restored = serializer.deserialize(serializer.serialize(result.map));
    expect(restored[`${side}Schema`]).toEqual(
      expect.objectContaining({
        rootName: 'Root',
        namespace: 'urn:original',
        inlineSchemaXml: expect.stringContaining('name="Root"'),
      })
    );
    expect(restored[side === 'source' ? 'targetSchema' : 'sourceSchema'].location).toBe('new.xsd');
  });
});
