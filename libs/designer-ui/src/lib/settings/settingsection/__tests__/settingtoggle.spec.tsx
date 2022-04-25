import type { SettingToggleProps } from '../settingtoggle';
import { RenderToggleSetting } from '../settingtoggle';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('ui/settings/settingtoggle', () => {
  let minimal: SettingToggleProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = { isReadOnly: false, checked: false };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should construct', () => {
    const settingToggle = renderer.render(<RenderToggleSetting {...minimal} />);
    expect(settingToggle).toMatchSnapshot();
  });
});
