import type { SettingTextFieldProps } from '../..';
import { SettingTextField } from '../settingtextfield';
import * as React from 'react';
import renderer from 'react-test-renderer';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('ui/settings/settingtextfield', () => {
    let minimal: SettingTextFieldProps, shallow: ReactShallowRenderer.ShallowRenderer;

    beforeEach(() => {
        minimal = { id: 'testId', isReadOnly: false, label: 'label text', value: 'sample value' };
        shallow = ReactShallowRenderer.createRenderer();
    });

    afterEach(() => {
        shallow.unmount();
    });

    it('should construct', () => {
        renderer.create(<SettingTextField {...minimal} />);
        const textField = shallow.getRenderOutput();
    })
});