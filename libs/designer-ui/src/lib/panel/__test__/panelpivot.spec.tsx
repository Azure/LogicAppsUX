import { PanelContent, type PanelContentProps } from '../panelContent';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('ui/workflowparameters/workflowparameter', () => {
  let minimal: PanelContentProps, renderer: ReactShallowRenderer.ShallowRenderer;
  beforeEach(() => {
    minimal = {
      nodeId: '',
      tabs: [],
      trackEvent: jest.fn(),
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

  it('should render when no tabs.', () => {
    renderer.render(<PanelContent {...minimal} />);
    const panelContent = renderer.getRenderOutput();
    const pivotMenu = panelContent.props.children;

    expect(pivotMenu.props.className).toBe('msla-panel-menu');
    expect(pivotMenu.props.overflowAriaLabel).toBe('more panels');
    expect(pivotMenu.props.children).toHaveLength(Object.keys(minimal.tabs).length);
  });

  it('should render menu items when passed tabs.', () => {
    // TODO: 13865562 When Tabs get setup
  });
});
