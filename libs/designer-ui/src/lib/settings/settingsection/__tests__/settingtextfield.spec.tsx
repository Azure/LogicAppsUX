import type { SettingTextFieldProps } from '../settingtextfield';
import { SettingTextField } from '../settingtextfield';
import renderer from 'react-test-renderer';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
describe('ui/settings/settingtextfield', () => {
  let minimal: SettingTextFieldProps;
  let shallow: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = { id: 'testId', readOnly: false, label: 'label text', value: 'sample value' };
    shallow = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    shallow.unmount();
  });

  it('should construct', () => {
    renderer.create(<SettingTextField {...minimal} />);
    const textField = shallow.getRenderOutput();
    expect(textField).toMatchSnapshot();
  });
});
