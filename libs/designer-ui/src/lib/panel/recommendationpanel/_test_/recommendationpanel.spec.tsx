import type { RecommendationPanelProps } from './../recommendationpanel';
import { RecommendationPanel } from './../recommendationpanel';
import { List } from '@fluentui/react';
import type { Connector, OperationSearchResult } from '@microsoft-logic-apps/utils';
import { MockSearchOperations } from '@microsoft-logic-apps/utils';
import { connectorsSearchResultsMock } from '@microsoft-logic-apps/utils';
import type { ReactPortal } from 'react';
import ReactDOM from 'react-dom';
import renderer from 'react-test-renderer';
import ShallowRenderer from 'react-test-renderer/shallow';

describe('recommendation panel', () => {
  const selectedConnector = connectorsSearchResultsMock[0];

  const searchMock = jest.fn();
  let props: RecommendationPanelProps;

  beforeEach(() => {
    props = {
      placeholder: 'search',
      onSearch: searchMock,
      toggleCollapse: jest.fn(),
      operationSearchResults: [],
      connectorBrowse: [selectedConnector],
      isCollapsed: false,
      width: '500px',
    };
  });

  beforeAll(() => {
    ReactDOM.createPortal = jest.fn((element, node) => {
      return element as ReactPortal;
    });
  });

  afterEach(() => {
    const mockPortal = ReactDOM.createPortal as jest.Mock;
    mockPortal.mockClear();
  });

  it('matches snapshot in browse view', () => {
    const shallowRenderer = ShallowRenderer.createRenderer();
    const component = shallowRenderer.render(<RecommendationPanel {...props}></RecommendationPanel>);
    expect(component).toMatchSnapshot();
  });

  it('matches snapshot in search view', () => {
    props.operationSearchResults = MockSearchOperations;
    const shallowRenderer = ShallowRenderer.createRenderer();
    const component = shallowRenderer.render(<RecommendationPanel {...props}></RecommendationPanel>);
    expect(component).toMatchSnapshot();
  });

  it('renders browse view when there are no search results', () => {
    const component = renderer.create(<RecommendationPanel {...props}></RecommendationPanel>);
    const list = component?.root?.findByType(List);
    const firstListitem = list.props['items'][0] as Connector;
    expect(firstListitem.name).toEqual(selectedConnector.name);
  });

  it('renders search view when there are search results', () => {
    props.operationSearchResults = MockSearchOperations;
    const component = renderer.create(<RecommendationPanel {...props}></RecommendationPanel>);
    const list = component?.root?.findByType(List);
    const firstListitem = list.props['items'][0] as OperationSearchResult;
    expect(firstListitem.name).toEqual(MockSearchOperations[0].name);
  });

  it('filters search view when a filter is selected', () => {
    props.operationSearchResults = MockSearchOperations;
    const component = renderer.create(<RecommendationPanel {...props}></RecommendationPanel>);
    const azureName = 'Azure';

    const buttons = component?.root?.findAllByType('button');
    const azureFilter = buttons.find((button) => {
      const spans = button.findAllByType('span');
      const azure = spans.find((span) => {
        if (span.props['children'] === azureName) {
          return span;
        }
        return false;
      });
      return azure !== undefined;
    });

    azureFilter?.props['onClick'](azureName);

    const list = component?.root?.findByType(List);
    const listItems = list.props['items'] as Array<OperationSearchResult>;
    const listLength = listItems.length;
    const expectedListLength = MockSearchOperations.filter((op) => op.properties.category === azureName).length;
    expect(listLength).toEqual(expectedListLength);
  });
});
