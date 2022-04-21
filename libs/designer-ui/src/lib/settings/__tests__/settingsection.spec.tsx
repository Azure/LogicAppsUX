import { SettingsSection } from '..';
import type { SettingSectionComponentProps } from '..';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('ui/settings/settingsection', () => {
  let minimal: SettingSectionComponentProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      id: 'settingId',
      title: 'random setting',
      expanded: false,
      isInverted: false,
      isReadOnly: false,
      renderContent: () => (
        <>
          <p className="sample-class-name">Sample JSX</p>
        </>
      ),
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct', () => {
    const settingSection = renderer.render(<SettingsSection {...minimal} />);
    expect(settingSection).toMatchSnapshot();
  });

  it('should have child section when expanded', () => {
    const props: SettingSectionComponentProps = { ...minimal, expanded: true };
    renderer.render(<SettingsSection {...props} />);
    const settingSection = renderer.getRenderOutput();

    expect(settingSection.props.className).toBe('msla-setting-section');

    const settingSectionChild = settingSection.props.children;
    expect(settingSectionChild.props.className).toBe('msla-setting-section-content');
  });
});
