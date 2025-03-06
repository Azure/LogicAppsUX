import type { MSIProps } from '..';
import type { BaseEditorProps, ChangeHandler } from '../../editor/base';
import { AuthenticationDropdown } from '../AuthenticationDropdown';
import { AuthenticationProperty } from '../AuthenticationProperty';
import { AUTHENTICATION_PROPERTIES } from '../util';
import type { IDropdownOption } from '@fluentui/react';
import { ResourceIdentityType } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';

interface MSIAuthenticationDefaultProps extends Partial<BaseEditorProps> {
  msiProps: MSIProps;
  onManagedIdentityChange(event: React.FormEvent<HTMLDivElement>, item: IDropdownOption): void;
  handleBlur: ChangeHandler;
}

export const MSIAuthenticationDefault = ({
  msiProps,
  onManagedIdentityChange,
  handleBlur,
  ...props
}: MSIAuthenticationDefaultProps): JSX.Element => {
  const intl = useIntl();

  const authNotEnabledError = intl.formatMessage({
    defaultMessage: 'Please enable managed identity for the logic app.',
    id: 'msf0d0fe61ceff',
    description: 'Error Message for disabled managed identity',
  });

  const systemAssignedManagedIdentity = intl.formatMessage({
    defaultMessage: 'System-assigned managed identity',
    id: 'msdfa4624930c0',
    description: 'System-assigned managed identity dropdown option text',
  });

  const MSIAuthLabel = intl.formatMessage({
    defaultMessage: 'Managed identity',
    id: 'msd9330693b281',
    description: 'Managed Identity Label',
  });
  const MSIAuthPlaceholder = intl.formatMessage({
    defaultMessage: 'Please select an identity',
    id: 'ms720abffb22a0',
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
      <AuthenticationProperty
        {...props}
        initialValue={msiAudience}
        AuthProperty={AUTHENTICATION_PROPERTIES.MSI_AUDIENCE}
        handleBlur={handleBlur}
      />
    </>
  );
};

function getIdentityDisplayName(msiIdentity: string): string {
  return msiIdentity.split('/').slice(-1)[0];
}
