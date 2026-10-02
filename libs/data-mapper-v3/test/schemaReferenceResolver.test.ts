import { getGlobalSchemaRootNames, resolveLooseSchemaReference } from '../src/schema/schemaReferenceResolver';

describe('loose BizTalk schema reference resolution', () => {
  const sourceReference = 'Contoso.ToolkitSchemas.IDocOperation_PEXR2002_700_3_Receive';
  const matchingPath = 'C:\\maps\\IDOC.PEXR2002IDocOperation.PEXR2002.700.3.Receive.xsd';

  test('matches CLR underscore identifiers to dot-separated XSD filenames', () => {
    expect(resolveLooseSchemaReference(sourceReference, ['C:\\maps\\Other.xsd', matchingPath])).toBe(matchingPath);
  });

  test('returns undefined for ambiguous normalized matches', () => {
    expect(
      resolveLooseSchemaReference(sourceReference, [matchingPath, 'C:\\other\\IDOC.PEXR2002IDocOperation.PEXR2002.700.3.Receive.xsd'])
    ).toBeUndefined();
  });

  test('deduplicates identical candidate paths before ambiguity checks', () => {
    expect(resolveLooseSchemaReference(sourceReference, [matchingPath, matchingPath])).toBe(matchingPath);
  });

  test('uses a global root name to disambiguate candidates', () => {
    const otherPath = 'C:\\other\\IDOC.PEXR2002IDocOperation.PEXR2002.700.3.Receive.xsd';
    const schemas = new Map([
      [matchingPath, '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="ExpectedRoot"/></xs:schema>'],
      [otherPath, '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="OtherRoot"/></xs:schema>'],
    ]);

    expect(
      resolveLooseSchemaReference(sourceReference, [matchingPath, otherPath], 'ExpectedRoot', (candidatePath) => schemas.get(candidatePath))
    ).toBe(matchingPath);
  });

  test('reads only global schema element names', () => {
    expect(
      getGlobalSchemaRootNames(`
        <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="Root">
            <xs:complexType><xs:sequence><xs:element name="Nested"/></xs:sequence></xs:complexType>
          </xs:element>
        </xs:schema>
      `)
    ).toEqual(['Root']);
  });
});
