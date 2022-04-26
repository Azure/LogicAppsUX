import type { RecommendationPanelProps } from './../recommendationpanel';
import { RecommendationPanel } from './../recommendationpanel';
import { List } from '@fluentui/react';
import type { Connector, OperationSearchResult } from '@microsoft-logic-apps/utils';
import { MockSearchOperations } from '@microsoft-logic-apps/utils';
import { connectorsSearchResultsMock } from '@microsoft-logic-apps/utils';
import type { ReactPortal } from 'react';
import ReactDOM from 'react-dom';
import renderer from 'react-test-renderer';

describe('recommendation panel', () => {
  // let shallow: ReactShallowRenderer.ShallowRenderer;
  const selectedConnector = connectorsSearchResultsMock[0];

  const searchMock = jest.fn();
  const props: RecommendationPanelProps = {
    placeholder: 'search',
    onSearch: searchMock,
    toggleCollapse: jest.fn(),
    operationSearchResults: [],
    connectorBrowse: [selectedConnector],
    isCollapsed: false,
    width: '500px',
  };

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
    const component = renderer.create(<RecommendationPanel {...props}></RecommendationPanel>).toJSON();
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
});
