import type { SettingToggleProps } from '../settingtoggle';
import { SettingToggle } from '../settingtoggle';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('ui/settings/settingtoggle', () => {
  let minimal: SettingToggleProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = { readOnly: false, checked: false };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct', () => {
    const settingToggle = renderer.render(<SettingToggle {...minimal} />);
    expect(settingToggle).toMatchSnapshot();
  });
});
