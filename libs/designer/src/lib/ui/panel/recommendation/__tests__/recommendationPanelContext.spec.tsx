import { RecommendationPanelContext } from '../recommendationPanelContext';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import ShallowRenderer from 'react-test-renderer/shallow';

describe('<RecommendationPanelContext>', () => {
  const props: CommonPanelProps = { toggleCollapse: jest.fn(), isCollapsed: false, width: '500px' };

  it('renders browse view when there are no search results', () => {
    const shallowRenderer = ShallowRenderer.createRenderer();
    const panel = <RecommendationPanelContext {...props}></RecommendationPanelContext>;
    shallowRenderer.render(panel);
    const component = shallowRenderer.getRenderOutput();
    expect(component.props.children.type.name).toEqual('BrowseView');
  });
});
