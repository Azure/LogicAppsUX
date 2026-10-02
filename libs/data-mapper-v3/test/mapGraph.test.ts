import { FunctoidCategory, LinkEndpointType, type MapPage, ParameterType, reconcilePageFunctoidLinks } from '../src/model';

function createPage(): MapPage {
  return {
    id: 'page1',
    name: 'Page 1',
    links: [
      {
        id: 'input-1',
        sourceId: '/Root/First',
        sourcePath: '/Root/First',
        targetId: 'extract',
        sourceType: LinkEndpointType.SchemaNode,
        targetType: LinkEndpointType.Functoid,
      },
      {
        id: 'input-2',
        sourceId: '/Root/Second',
        sourcePath: '/Root/Second',
        targetId: 'extract',
        sourceType: LinkEndpointType.SchemaNode,
        targetType: LinkEndpointType.Functoid,
      },
      {
        id: 'output',
        sourceId: 'extract',
        targetId: '/Root/Result',
        targetPath: '/Root/Result',
        sourceType: LinkEndpointType.Functoid,
        targetType: LinkEndpointType.SchemaNode,
      },
    ],
    functoids: [
      {
        id: 'extract',
        functoidId: 106,
        category: FunctoidCategory.String,
        name: 'String Extract',
        x: 100,
        y: 100,
        inputLinks: ['input-2'],
        outputLinks: [],
        parameters: [{ index: 0, type: ParameterType.Constant, value: '1' }],
      },
    ],
  };
}

describe('functoid graph reconciliation', () => {
  test('synchronizes ordered input parameters and bidirectional link metadata', () => {
    const page = createPage();

    reconcilePageFunctoidLinks(page);

    expect(page.functoids[0].inputLinks).toEqual(['input-2', 'input-1']);
    expect(page.functoids[0].outputLinks).toEqual(['output']);
    expect(page.functoids[0].parameters).toEqual([
      { index: 0, type: ParameterType.Constant, value: '1' },
      { index: 1, type: ParameterType.Link, value: 'input-2' },
      { index: 2, type: ParameterType.Link, value: 'input-1' },
    ]);
  });

  test('removes deleted links from functoid metadata and parameters', () => {
    const page = createPage();
    reconcilePageFunctoidLinks(page);
    page.links = page.links.filter((link) => link.id !== 'input-2' && link.id !== 'output');

    reconcilePageFunctoidLinks(page);

    expect(page.functoids[0].inputLinks).toEqual(['input-1']);
    expect(page.functoids[0].outputLinks).toEqual([]);
    expect(page.functoids[0].parameters).toEqual([
      { index: 0, type: ParameterType.Constant, value: '1' },
      { index: 1, type: ParameterType.Link, value: 'input-1' },
    ]);
  });
});
