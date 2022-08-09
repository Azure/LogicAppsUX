import { store } from '../../../../core/store';
import { RecommendationPanelContext } from '../recommendationPanelContext';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import React from 'react';
import { Provider } from 'react-redux';
import ReactShallowRenderer from 'react-test-renderer/shallow';

describe('<RecommendationPanelContext>', () => {
  const props: CommonPanelProps = { toggleCollapse: jest.fn(), isCollapsed: false, width: '500px' };
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(
      <Provider store={store}>
        <RecommendationPanelContext {...props} />
      </Provider>
    );
    const component = renderer.getRenderOutput().props.children;
    expect(component.type.name).toEqual('RecommendationPanelContext');
  });
});
