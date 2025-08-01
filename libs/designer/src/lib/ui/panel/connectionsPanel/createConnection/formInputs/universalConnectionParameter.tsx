import { ConnectionParameterRow } from '../connectionParameterRow';
// eslint-disable-next-line import/no-named-as-default
import GatewayPicker from './gatewayPicker';
import type { IDropdownOption } from '@fluentui/react';
import { Checkbox, Dropdown, TextField } from '@fluentui/react';
import type {
  ConnectionParameter,
  ConnectionParameterAllowedValue,
  ConnectionParameterSet,
  ManagedIdentity,
} from '@microsoft/logic-apps-shared';
import { ConnectionParameterTypes, equals } from '@microsoft/logic-apps-shared';
import LegacyManagedIdentityDropdown from './legacyManagedIdentityPicker';
import constants from '../../../../../common/constants';
import ClientSecretInput from './clientSecretInput';

export interface ConnectionParameterProps {
  parameterKey: string;
  parameter: ConnectionParameter;
  value: any;
  setValue: (value: any) => void;
  isLoading?: boolean;
  isSubscriptionDropdownDisabled?: boolean;
  selectedSubscriptionId?: string;
  selectSubscriptionCallback?: (subscriptionId: string) => void;
  availableGateways?: any[];
  availableSubscriptions?: any[];
  identity?: ManagedIdentity;
  setKeyValue?: (key: string, value: any) => void;
  parameterSet?: ConnectionParameterSet;
  operationParameterValues?: Record<string, any>;
}

export const UniversalConnectionParameter = (props: ConnectionParameterProps) => {
  const {
    parameterKey,
    parameter,
    value,
    setValue,
    isSubscriptionDropdownDisabled,
    isLoading,
    selectedSubscriptionId,
    selectSubscriptionCallback,
    availableGateways,
    availableSubscriptions,
    identity,
  } = props;

  const data = parameter?.uiDefinition;
  const description = data?.description ?? data?.schema?.description;
  const constraints = parameter?.uiDefinition?.constraints;
  let inputComponent = undefined;

  // Gateway setting parameter
  if (parameter?.type === ConnectionParameterTypes.gatewaySetting) {
    inputComponent = (
      <GatewayPicker
        parameterKey={parameterKey}
        selectedSubscriptionId={selectedSubscriptionId}
        selectSubscriptionCallback={selectSubscriptionCallback}
        availableGateways={availableGateways}
        availableSubscriptions={availableSubscriptions}
        isSubscriptionDropdownDisabled={isSubscriptionDropdownDisabled}
        isLoading={isLoading}
        setValue={setValue}
        value={value}
      />
    );
  }

  // Managed Identity picker
  else if (equals(constraints?.editor, 'identitypicker')) {
    const onManagedIdentityChange = (_: any, option?: IDropdownOption<any>) => {
      const identitySelected = option?.key.toString() !== constants.SYSTEM_ASSIGNED_MANAGED_IDENTITY ? option?.key.toString() : undefined;
      setValue(identitySelected);
    };
    inputComponent = <LegacyManagedIdentityDropdown identity={identity} onChange={onManagedIdentityChange} disabled={isLoading} />;
  }

  // Boolean parameter
  else if (parameter?.type === ConnectionParameterTypes.bool) {
    if (value === undefined) {
      setValue(false);
    }
    inputComponent = <Checkbox checked={value} onChange={(e: any, checked?: boolean) => setValue(checked)} label={description} />;
  }

  // Dropdown Parameter
  else if ((constraints?.allowedValues?.length ?? 0) > 0) {
    const selectedKey = constraints?.allowedValues?.findIndex((_value) => _value.value === value);
    if (selectedKey === -1) {
      setValue(constraints?.allowedValues?.[0].value);
    }
    inputComponent = (
      <Dropdown
        id={`connection-param-${parameterKey}`}
        className="connection-parameter-input"
        selectedKey={selectedKey}
        onChange={(e: any, newVal?: IDropdownOption) => setValue(newVal?.data ?? newVal?.text)}
        disabled={isLoading}
        ariaLabel={description}
        placeholder={description}
        options={(constraints?.allowedValues ?? []).map((allowedValue: ConnectionParameterAllowedValue, index) => ({
          key: index,
          text: allowedValue?.text ?? allowedValue.value,
          data: allowedValue.value,
        }))}
      />
    );
  }

  // Client Certificate Parameter
  else if (parameter?.type === ConnectionParameterTypes.clientCertificate) {
    inputComponent = <ClientSecretInput isLoading={isLoading} parameterKey={parameterKey} setValue={setValue} value={value} />;
  }

  // Text Input Parameter
  else {
    const isSecure = parameter.type === 'securestring' && !constraints?.clearText;
    const type = isSecure ? 'password' : 'text';

    inputComponent = (
      <TextField
        styles={{ fieldGroup: { minHeight: '24px' } }}
        id={parameterKey}
        className="connection-parameter-input"
        disabled={isLoading}
        autoComplete="off"
        type={type}
        canRevealPassword
        ariaLabel={description}
        placeholder={description}
        value={value}
        multiline={type !== 'password'}
        autoAdjustHeight
        resizable={false}
        rows={1}
        onChange={(e: any, newVal?: string) => setValue(newVal)}
      />
    );
  }

  return (
    <ConnectionParameterRow
      parameterKey={parameterKey}
      displayName={data?.displayName ?? parameterKey}
      tooltip={data?.tooltip}
      required={constraints?.required === 'true'}
      disabled={isLoading}
    >
      {inputComponent}
    </ConnectionParameterRow>
  );
};
