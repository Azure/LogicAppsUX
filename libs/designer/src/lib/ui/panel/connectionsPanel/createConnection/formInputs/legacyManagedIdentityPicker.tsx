import { Dropdown, type IDropdownOption } from '@fluentui/react';
import { getIdentityDropdownOptions, type ManagedIdentity } from '@microsoft/logic-apps-shared';
import { useEffect, useMemo, useRef } from 'react';
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

  // Use a ref for onChange so the effect only fires when dropdownOptions changes,
  // not on every render when the parent re-creates the onChange callback.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => onChangeRef.current(null, dropdownOptions?.[0]), [dropdownOptions]);

  const noIdentitiesAvailable = useMemo(() => dropdownOptions.length === 0, [dropdownOptions]);
  const noIdentityText = intl.formatMessage({
    defaultMessage: 'No identities available',
    id: 'Z8BOCl',
    description: 'Placeholder warning for no identities available',
  });

  return (
    <Dropdown
      className={'connection-parameter-input'}
      onChange={onChange}
      placeholder={noIdentitiesAvailable ? noIdentityText : undefined}
      disabled={disabled || noIdentitiesAvailable}
      options={dropdownOptions}
      defaultSelectedKey={dropdownOptions[0]?.key}
    />
  );
};

export default LegacyManagedIdentityDropdown;
