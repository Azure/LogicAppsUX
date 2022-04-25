import type { RecommendationPanelProps } from './../recommendationpanel';
import { RecommendationPanel } from './../recommendationpanel';
import { ConnectorsMock } from '@microsoft-logic-apps/utils';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('recommendation panel', () => {
  let shallow: ReactShallowRenderer.ShallowRenderer;
  const searchMock = jest.fn();
  const props: RecommendationPanelProps = {
    placeholder: 'search',
    onSearch: searchMock,
    toggleCollapse: jest.fn(),
    operationSearchResults: [],
    connectorBrowse: [ConnectorsMock[0]],
    isCollapsed: false,
    width: '500px',
  };

  beforeEach(() => {
    shallow = ReactShallowRenderer.createRenderer();
  });

  it('renders browse view when there are no search results', () => {
    const component = shallow.render(<RecommendationPanel {...props}></RecommendationPanel>);
    expect(component).toMatchSnapshot();
  });
});
