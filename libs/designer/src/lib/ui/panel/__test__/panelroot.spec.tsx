import { store } from '../../../core/store';
import type { PanelRootProps } from '../panelroot';
import { PanelRoot } from '../panelroot';
import * as React from 'react';
import { Provider } from 'react-redux';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('ui/workflowparameters/workflowparameter', () => {
  let minimal: PanelRootProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {};
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct.', () => {
    const panel = renderer.render(
      <Provider store={store}>
        {' '}
        <PanelRoot {...minimal} />{' '}
      </Provider>
    );
    expect(panel).toMatchSnapshot();
  });
});
