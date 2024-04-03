import { PanelContent, type PanelContentProps } from '../panelcontent';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('ui/workflowparameters/workflowparameter', () => {
  let minimal: PanelContentProps, renderer: ReactShallowRenderer.ShallowRenderer;
  beforeEach(() => {
    minimal = {
      nodeId: '',
      tabs: [],
      trackEvent: vi.fn(),
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct.', () => {
    const panelContent = renderer.render(<PanelContent {...minimal} />);
    expect(panelContent).toMatchSnapshot();
  });

  it('should render menu items when passed tabs.', () => {
    // TODO: 13865562 When Tabs get setup
  });
});
