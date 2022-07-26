import type { RecommendationPanelProps } from './../recommendationpanel';
import { RecommendationPanel } from './../recommendationpanel';
import type { ReactPortal } from 'react';
import ReactDOM from 'react-dom';
import ShallowRenderer from 'react-test-renderer/shallow';

describe('recommendation panel', () => {
  const searchMock = jest.fn();
  let props: RecommendationPanelProps;

  beforeEach(() => {
    props = {
      placeholder: 'search',
      onSearch: searchMock,
      toggleCollapse: jest.fn(),
      isCollapsed: false,
      width: '500px',
    };
  });

  beforeAll(() => {
    ReactDOM.createPortal = jest.fn((element, _node) => {
      return element as ReactPortal;
    });
  });

  afterEach(() => {
    const mockPortal = ReactDOM.createPortal as jest.Mock;
    mockPortal.mockClear();
  });

  it('matches snapshot', () => {
    const shallowRenderer = ShallowRenderer.createRenderer();
    const component = shallowRenderer.render(<RecommendationPanel {...props}></RecommendationPanel>);
    expect(component).toMatchSnapshot();
  });

  // it.skip('filters search view when a filter is selected', () => {
  //   const component = renderer.create(<RecommendationPanel {...props}></RecommendationPanel>);
  //   const azureName = 'Azure';

  //   const buttons = component?.root?.findAllByType('button');
  //   const azureFilter = buttons.find((button) => {
  //     const spans = button.findAllByType('span');
  //     const azure = spans.find((span) => {
  //       if (span.props['children'] === azureName) {
  //         return span;
  //       }
  //       return false;
  //     });
  //     return azure !== undefined;
  //   });

  //   act(() => azureFilter?.props['onClick'](azureName));

  //   const list = component?.root?.findByType(Stack);
  // const listItems = list.props['items'] as Array<OperationSearchResult>;
  // const listLength = listItems.length;
  // const expectedListLength = MockSearchOperations.filter((op) => op.properties.category === azureName).length;
  // expect(listLength).toEqual(expectedListLength);
  //});
});
