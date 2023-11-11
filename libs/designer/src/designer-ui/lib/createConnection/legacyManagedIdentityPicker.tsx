import { Dropdown, type IDropdownOption } from '@fluentui/react';
import { getIdentityDropdownOptions, type ManagedIdentity } from '@microsoft/logic-apps-designer';
import { useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';

interface LegacyManagedIdentityDropdownProps {
  identity?: ManagedIdentity;
  onChange: (event: any, item?: IDropdownOption<any>) => void;
  disabled?: boolean;
}

const LegacyManagedIdentityDropdown = (props: LegacyManagedIdentityDropdownProps) => {
  const { identity, onChange, disabled } = props;
  const intl = useIntl();
  const dropdownOptions = useMemo(() => getIdentityDropdownOptions(identity, intl), [identity, intl]);

  // Set value to first option on start
  useEffect(() => onChange(undefined, dropdownOptions[0]), [dropdownOptions, onChange]);

  return (
    <Dropdown
      className={'connection-parameter-input'}
      onChange={onChange}
      disabled={disabled}
      options={dropdownOptions}
      defaultSelectedKey={dropdownOptions[0]?.key}
    />
  );
};

export default LegacyManagedIdentityDropdown;
