import type { MSIProps } from '..';
import type { ChangeHandler, GetTokenPickerHandler } from '../../editor/base';
import type { TokenPickerButtonEditorProps } from '../../editor/base/plugins/tokenpickerbutton';
import { AuthenticationDropdown } from '../AuthenticationDropdown';
import { AuthenticationProperty } from '../AuthenticationProperty';
import { AUTHENTICATION_PROPERTIES } from '../util';
import type { IDropdownOption } from '@fluentui/react';
import { ResourceIdentityType } from '@microsoft/utils-logic-apps';
import { useIntl } from 'react-intl';

interface MSIAuthenticationDefaultProps {
  msiProps: MSIProps;
  readonly?: boolean;
  tokenPickerButtonProps?: TokenPickerButtonEditorProps;
  getTokenPicker: GetTokenPickerHandler;
  onManagedIdentityChange(event: React.FormEvent<HTMLDivElement>, item: IDropdownOption): void;
  onBlur: ChangeHandler;
}

export const MSIAuthenticationDefault = ({
  msiProps,
  onManagedIdentityChange,
  onBlur,
  ...props
}: MSIAuthenticationDefaultProps): JSX.Element => {
  const intl = useIntl();

  const authNotEnabledError = intl.formatMessage({
    defaultMessage: 'Please enable managed identity for the logic app.',
    description: 'Error Message for disabled managed identity',
  });

  const systemAssignedManagedIdentity = intl.formatMessage({
    defaultMessage: 'System-assigned managed identity',
    description: 'System-assigned managed identity dropdown option text',
  });

  const MSIAuthLabel = intl.formatMessage({
    defaultMessage: 'Managed identity',
    description: 'Managed Identity Label',
  });
  const MSIAuthPlaceholder = intl.formatMessage({
    defaultMessage: 'Please select an identity',
    description: 'Placehodler text for dropdown',
  });

  const { msiIdentity, msiAudience } = msiProps;

  const managedIdentityOption: IDropdownOption[] = msiIdentity
    ? [{ key: msiIdentity, text: getIdentityDisplayName(msiIdentity) }]
    : [{ key: ResourceIdentityType.SYSTEM_ASSIGNED, text: systemAssignedManagedIdentity }];

  return (
    <>
      <AuthenticationDropdown
        readonly={props.readonly}
        dropdownPlaceholder={MSIAuthPlaceholder}
        dropdownLabel={MSIAuthLabel}
        errorMessage={authNotEnabledError}
        selectedKey={msiIdentity ?? ResourceIdentityType.SYSTEM_ASSIGNED}
        options={managedIdentityOption}
        onChange={onManagedIdentityChange}
      />
      <AuthenticationProperty {...props} initialValue={msiAudience} AuthProperty={AUTHENTICATION_PROPERTIES.MSI_AUDIENCE} onBlur={onBlur} />
    </>
  );
};

function getIdentityDisplayName(msiIdentity: string): string {
  return msiIdentity.split('/').slice(-1)[0];
}
