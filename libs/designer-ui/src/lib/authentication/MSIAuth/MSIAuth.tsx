import type { AuthProps, MSIProps } from '..';
import type { ChangeState, TokenPickerHandler } from '../../editor/base';
import { AuthenticationDropdown } from '../AuthenticationDropdown';
import { AuthenticationProperty } from '../AuthenticationProperty';
import { AUTHENTICATION_PROPERTIES, containsUserAssignedIdentities } from '../util';
import { MSIAuthenticationDefault } from './MSIAuthDefault';
import type { IDropdownOption } from '@fluentui/react';
import type { ManagedIdentity } from '@microsoft-logic-apps/utils';
import { ResourceIdentityType, equals } from '@microsoft-logic-apps/utils';
import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import type { IntlShape } from 'react-intl';
import { useIntl } from 'react-intl';

interface MSIAuthenticationProps {
  msiProps: MSIProps;
  identity?: ManagedIdentity;
  tokenPickerHandler: TokenPickerHandler;
  onManagedIdentityChange(event: React.FormEvent<HTMLDivElement>, item: IDropdownOption): void;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
}

export const MSIAuthentication = ({
  identity,
  msiProps,
  tokenPickerHandler,
  onManagedIdentityChange,
  setCurrentProps,
}: MSIAuthenticationProps): JSX.Element => {
  const intl = useIntl();
  const { options, errorMessage: error } = getManagedIdentityData(identity, msiProps.msiIdentity, intl);
  const [errorMessage] = useState(error);
  const [managedIdentityDropdownOptions] = useState<IDropdownOption[]>(options);

  const updateMsiAudience = (newState: ChangeState) => {
    setCurrentProps((prevState: AuthProps) => ({
      ...prevState,
      msi: { ...prevState.msi, msiAudience: newState.value },
    }));
  };

  const MSIAuthLabel = intl.formatMessage({
    defaultMessage: 'Managed identity',
    description: 'Managed Identity Label',
  });
  const MSIAuthPlaceholder = intl.formatMessage({
    defaultMessage: 'Please select an identity',
    description: 'Placehodler text for dropdown',
  });

  const { msiAudience, msiIdentity } = msiProps;

  return (
    <div className="msla-authentication-editor-MSI-container">
      {identity?.type ? (
        <>
          <AuthenticationDropdown
            dropdownLabel={MSIAuthLabel}
            dropdownPlaceholder={MSIAuthPlaceholder}
            errorMessage={errorMessage}
            selectedKey={msiIdentity ?? ResourceIdentityType.SYSTEM_ASSIGNED}
            options={managedIdentityDropdownOptions}
            onChange={onManagedIdentityChange}
          />
          <AuthenticationProperty
            initialValue={msiAudience}
            AuthProperty={AUTHENTICATION_PROPERTIES.MSI_AUDIENCE}
            tokenPickerHandler={tokenPickerHandler}
            onBlur={updateMsiAudience}
          />
        </>
      ) : (
        <MSIAuthenticationDefault
          msiProps={msiProps}
          tokenPickerHandler={tokenPickerHandler}
          onManagedIdentityChange={onManagedIdentityChange}
          onBlur={updateMsiAudience}
        />
      )}
    </div>
  );
};

const getManagedIdentityData = (
  identity: ManagedIdentity | undefined,
  selectedManagedIdentityKey: string | undefined,
  intl: IntlShape
): { options: IDropdownOption<any>[]; errorMessage?: string } => {
  const identityOptions: IDropdownOption<any>[] = [];
  let errorMessage: string | undefined;

  const invalidUserAssignedManagedIdentity = intl.formatMessage({
    defaultMessage: 'The entered identity is not associated with this Logic App.',
    description: 'error message for invalid user',
  });
  const systemAssignedManagedIdentity = intl.formatMessage({
    defaultMessage: 'System-assigned managed identity',
    description: 'Text for dropdown of system-assigned managed identity',
  });
  const userIdentityNotSupported = intl.formatMessage({
    defaultMessage: 'User identity is not supported when Logic App has system assigned managed identity enabled.',
    description: 'error message for unspported identity',
  });
  const userAssignedIdentities = containsUserAssignedIdentities(identity) ? getUserAssignedIdentities(identity) : undefined;
  if (identity?.type) {
    if (
      equals(identity.type, ResourceIdentityType.USER_ASSIGNED) ||
      equals(identity.type, ResourceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED)
    ) {
      if (userAssignedIdentities) {
        identityOptions.push(...userAssignedIdentities);
      }

      if (selectedManagedIdentityKey && userAssignedIdentities?.find((userIdentity) => userIdentity.key === selectedManagedIdentityKey)) {
        identityOptions.push({ key: selectedManagedIdentityKey, text: getIdentityDisplayName(selectedManagedIdentityKey) });
        errorMessage = invalidUserAssignedManagedIdentity;
      }
    }
    if (
      equals(identity.type, ResourceIdentityType.SYSTEM_ASSIGNED) ||
      equals(identity.type, ResourceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED)
    ) {
      identityOptions.push({ key: ResourceIdentityType.SYSTEM_ASSIGNED, text: systemAssignedManagedIdentity });

      if (selectedManagedIdentityKey && equals(identity.type, ResourceIdentityType.SYSTEM_ASSIGNED)) {
        identityOptions.push({ key: selectedManagedIdentityKey, text: getIdentityDisplayName(selectedManagedIdentityKey) });
        errorMessage = userIdentityNotSupported;
      }
    }
  }

  return { options: identityOptions, errorMessage };
};

const getUserAssignedIdentities = (identity: ManagedIdentity | undefined): IDropdownOption[] => {
  const options: IDropdownOption[] = [];
  if (identity?.userAssignedIdentities) {
    for (const userAssignedIdentity of Object.keys(identity.userAssignedIdentities)) {
      options.push({
        key: userAssignedIdentity,
        text: getIdentityDisplayName(userAssignedIdentity),
      });
    }
  }
  return options;
};

const getIdentityDisplayName = (msiIdentity: string): string => {
  return msiIdentity.split('/').slice(-1)[0];
};
