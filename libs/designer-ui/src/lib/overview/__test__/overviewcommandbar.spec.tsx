import ReactShallowRenderer from 'react-test-renderer/shallow';
import type { CallbackInfo } from '../overview';
import { OverviewCommandBar, OverviewCommandBarProps } from '../overviewcommandbar';

describe('lib/overview/overviewcommandbar', () => {
  let minimal: OverviewCommandBarProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      onRefresh: jest.fn(),
      onRunTrigger: jest.fn(),
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('renders correctly', () => {
    renderer.render(<OverviewCommandBar {...minimal} />);

    const root = renderer.getRenderOutput();
    expect(root.props.items).toEqual([
      expect.objectContaining({
        ariaLabel: 'Refresh',
        iconProps: { iconName: 'Refresh' },
        key: 'Refresh',
        name: 'Refresh',
      }),
    ]);
  });

  it('renders with Run trigger button', () => {
    const callbackInfo: CallbackInfo = {
      value: 'workflowProperties.callbackInfo.value',
    };

    renderer.render(<OverviewCommandBar {...minimal} callbackInfo={callbackInfo} />);

    const root = renderer.getRenderOutput();
    const [, runTrigger] = root.props.items;
    expect(runTrigger).toEqual(
      expect.objectContaining({
        ariaLabel: 'Run trigger',
        iconProps: { iconName: 'Play' },
        key: 'RunTrigger',
        name: 'Run trigger',
      })
    );
  });
});
