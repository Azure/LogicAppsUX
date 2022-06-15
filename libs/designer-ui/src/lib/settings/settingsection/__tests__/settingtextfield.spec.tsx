import type { SettingTextFieldProps } from '../settingtextfield';
import { SettingTextField } from '../settingtextfield';
import renderer from 'react-test-renderer';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('ui/settings/settingtextfield', () => {
  let minimal: SettingTextFieldProps, shallow: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = { id: 'testId', readOnly: false, label: 'label text', value: 'sample value', visible: true };
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
