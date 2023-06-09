import { store } from '../../../core/store';
import type { SearchableSettingsDropdownProps } from '../settingdropdown';
import { SearchableSettingsDropdown } from '../settingdropdown';
import type { SettingTextFieldProps } from '@microsoft/designer-ui';
import { Provider } from 'react-redux';
import renderer from 'react-test-renderer';

jest.mock('@fluentui/react', () => ({
  ...jest.requireActual('@fluentui/react'),
  Dropdown: 'Dropdown',
}));

describe('ui/settings/settingdropdown', () => {
  it('should create a dropdown without a search box for 3 settings', () => {
    const props: SearchableSettingsDropdownProps = {
      conditionallyInvisibleSettings: [
        { settingProp: { id: 'foo', label: 'Foo' } as SettingTextFieldProps, settingType: 'SettingTextField' },
        { settingProp: { id: 'bar', label: 'Bar' } as SettingTextFieldProps, settingType: 'SettingTextField' },
        { settingProp: { id: 'baz', label: 'Baz' } as SettingTextFieldProps, settingType: 'SettingTextField' },
      ],
      groupId: 'group1',
      nodeId: 'Send_an_email',
    };
    const component = (
      <Provider store={store}>
        <SearchableSettingsDropdown {...props} />
      </Provider>
    );
    const renderedComponent = renderer.create(component).toJSON();
    expect(renderedComponent).toMatchSnapshot();
  });

  it('should create a dropdown with a search box for 5 settings', () => {
    const props: SearchableSettingsDropdownProps = {
      conditionallyInvisibleSettings: [
        { settingProp: { id: 'foo', label: 'Foo' } as SettingTextFieldProps, settingType: 'SettingTextField' },
        { settingProp: { id: 'bar', label: 'Bar' } as SettingTextFieldProps, settingType: 'SettingTextField' },
        { settingProp: { id: 'baz', label: 'Baz' } as SettingTextFieldProps, settingType: 'SettingTextField' },
        { settingProp: { id: 'qux', label: 'Qux' } as SettingTextFieldProps, settingType: 'SettingTextField' },
        { settingProp: { id: 'qoz', label: 'Qoz' } as SettingTextFieldProps, settingType: 'SettingTextField' },
      ],
      groupId: 'group2',
      nodeId: 'Send_an_email',
    };
    const component = (
      <Provider store={store}>
        <SearchableSettingsDropdown {...props} />
      </Provider>
    );
    const renderedComponent = renderer.create(component).toJSON();
    expect(renderedComponent).toMatchSnapshot();
  });
});
