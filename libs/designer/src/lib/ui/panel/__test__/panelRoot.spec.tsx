import { store } from '../../../core/store';
import { PanelRoot } from '../panelRoot';
import { Provider } from 'react-redux';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('ui/workflowparameters/workflowparameter', () => {
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct.', () => {
    const panel = renderer.render(
      <Provider store={store}>
        {' '}
        <PanelRoot displayRuntimeInfo={false} />{' '}
      </Provider>
    );
    expect(panel).toMatchSnapshot();
  });
});
