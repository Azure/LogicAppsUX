import type { AuthProps, MSIProps } from '..';
import type { ValueSegment } from '../../editor';
import type { ChangeState, GetTokenPickerHandler } from '../../editor/base';
import type { TokenPickerButtonEditorProps } from '../../editor/base/plugins/tokenpickerbutton';
import { AuthenticationDropdown } from '../AuthenticationDropdown';
import { AuthenticationProperty } from '../AuthenticationProperty';
import { AUTHENTICATION_PROPERTIES, containsUserAssignedIdentities } from '../util';
import { MSIAuthenticationDefault } from './MSIAuthDefault';
import type { IDropdownOption } from '@fluentui/react';
import { isTemplateExpression, ResourceIdentityType, equals } from '@microsoft/logic-apps-shared';
import type { ManagedIdentity } from '@microsoft/logic-apps-shared';
import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import type { IntlShape } from 'react-intl';
import { useIntl } from 'react-intl';

interface MSIAuthenticationProps {
  msiProps: MSIProps;
  identity?: ManagedIdentity;
  readonly?: boolean;
  tokenPickerButtonProps?: TokenPickerButtonEditorProps;
  setCurrentProps: Dispatch<SetStateAction<AuthProps>>;
  getTokenPicker: GetTokenPickerHandler;
  tokenMapping?: Record<string, ValueSegment>;
  loadParameterValueFromString?: (value: string) => ValueSegment[];
}

export const MSIAuthentication = ({ identity, msiProps, setCurrentProps, ...props }: MSIAuthenticationProps): JSX.Element => {
  const intl = useIntl();
  const { options, errorMessage: error } = getManagedIdentityData(identity, msiProps.msiIdentity, intl);
  const [errorMessage, setErrorMessage] = useState(error);
  const [managedIdentityDropdownOptions] = useState<IDropdownOption[]>(options);

  const onManagedIdentityChange = (_event: React.FormEvent<HTMLDivElement>, item: IDropdownOption): void => {
    setCurrentProps((prevState: AuthProps) => ({
      msi: {
        ...prevState.msi,
        msiIdentity: item.key === ResourceIdentityType.SYSTEM_ASSIGNED ? undefined : (item.key as ResourceIdentityType),
      },
    }));
    setErrorMessage(getManagedIdentityData(identity, item.key as string | undefined, intl).errorMessage);
  };

  const updateMsiAudience = (newState: ChangeState) => {
    setCurrentProps((prevState: AuthProps) => ({
      ...prevState,
      msi: { ...prevState.msi, msiAudience: newState.value },
    }));
  };

  const MSIAuthLabel = intl.formatMessage({
    defaultMessage: 'Managed identity',
    id: '2TMGk7',
    description: 'Managed Identity Label',
  });
  const MSIAuthPlaceholder = intl.formatMessage({
    defaultMessage: 'select an identity',
    id: 'tGSsgZ',
    description: 'Placehodler text for dropdown',
  });

  const { msiAudience, msiIdentity } = msiProps;

  return (
    <div className="msla-authentication-editor-MSI-container">
      {identity?.type ? (
        <>
          <AuthenticationDropdown
            readonly={props.readonly}
            dropdownLabel={MSIAuthLabel}
            dropdownPlaceholder={MSIAuthPlaceholder}
            errorMessage={errorMessage}
            selectedKey={msiIdentity ?? ResourceIdentityType.SYSTEM_ASSIGNED}
            options={managedIdentityDropdownOptions}
            onChange={onManagedIdentityChange}
          />
          <AuthenticationProperty
            {...props}
            initialValue={msiAudience}
            AuthProperty={AUTHENTICATION_PROPERTIES.MSI_AUDIENCE}
            onBlur={updateMsiAudience}
          />
        </>
      ) : (
        <MSIAuthenticationDefault
          {...props}
          msiProps={msiProps}
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
    defaultMessage: 'The entered identity is not associated with this logic app.',
    id: 'UPsZSw',
    description: 'error message for invalid user',
  });
  const systemAssignedManagedIdentity = intl.formatMessage({
    defaultMessage: 'System-assigned managed identity',
    id: 'i/SguY',
    description: 'Text for dropdown of system-assigned managed identity',
  });
  const systemIdentityNotSupported = intl.formatMessage({
    defaultMessage: "The system-assigned identity is unavailable because it's not enabled.",
    id: '8KpZmj',
    description: 'error message for unsupported system-assigned managed identity',
  });
  const userAssignedIdentities = containsUserAssignedIdentities(identity) ? getUserAssignedIdentities(identity) : undefined;
  if (identity?.type) {
    const supportedIdentityTypes = identity.type.split(',').map((identity) => identity.trim());
    // determines which identities to support based on the identity type
    const supportsUserAssignedIdentity = supportedIdentityTypes.some((type) => equals(type, ResourceIdentityType.USER_ASSIGNED));
    const supportsSystemAssignedIdentity = supportedIdentityTypes.some((type) => equals(type, ResourceIdentityType.SYSTEM_ASSIGNED));

    // add the user assigned identities to the dropdown options
    if (supportsUserAssignedIdentity && userAssignedIdentities) {
      identityOptions.push(...userAssignedIdentities);
    }

    // add the system assigned identity to the dropdown options
    if (supportsSystemAssignedIdentity) {
      identityOptions.push({ key: ResourceIdentityType.SYSTEM_ASSIGNED, text: systemAssignedManagedIdentity });
    }

    // Logic for if the user manually enters an identity in the codeview or collapsed view
    // User tries to enter a system assigned identity when system assigned identity is not supported
    if (isSystemAssignedIdentity(selectedManagedIdentityKey) && !supportsSystemAssignedIdentity) {
      errorMessage = systemIdentityNotSupported;
    }
    // User tries to enter a user assigned identity that is not in the list of user assigned identities
    else if (
      selectedManagedIdentityKey &&
      !isSystemAssignedIdentity(selectedManagedIdentityKey) &&
      !userAssignedIdentities?.find((userIdentity) => userIdentity.key === selectedManagedIdentityKey)
    ) {
      identityOptions.push({ key: selectedManagedIdentityKey, text: getIdentityDisplayName(selectedManagedIdentityKey) });
      if (!isTemplateExpression(selectedManagedIdentityKey)) {
        errorMessage = invalidUserAssignedManagedIdentity;
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

const isSystemAssignedIdentity = (key: string | undefined): boolean => {
  return key === ResourceIdentityType.SYSTEM_ASSIGNED;
};
