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
import { useCallback, useEffect, useMemo } from 'react';

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

  const data = useMemo(() => parameter?.uiDefinition, [parameter?.uiDefinition]);
  const description = useMemo(() => data?.description ?? data?.schema?.description, [data?.description, data?.schema?.description]);
  const constraints = useMemo(() => parameter?.uiDefinition?.constraints, [parameter?.uiDefinition?.constraints]);

  // Memoize the selected key lookup for dropdown parameters
  const selectedKey = useMemo(() => {
    if ((constraints?.allowedValues?.length ?? 0) === 0) {
      return -1;
    }
    return constraints?.allowedValues?.findIndex((_value) => _value.value === value) ?? -1;
  }, [constraints?.allowedValues, value]);

  // Memoize dropdown options to prevent recreation on each render
  const dropdownOptions = useMemo(() => {
    if ((constraints?.allowedValues?.length ?? 0) === 0) {
      return [];
    }
    return (constraints?.allowedValues ?? []).map((allowedValue: ConnectionParameterAllowedValue, index) => ({
      key: index,
      text: allowedValue?.text ?? allowedValue.value,
      data: allowedValue.value,
    }));
  }, [constraints?.allowedValues]);

  // Memoize text field type and security settings
  const textFieldConfig = useMemo(() => {
    const isSecure = parameter.type === 'securestring' && !constraints?.clearText;
    const type = isSecure ? 'password' : 'text';
    return { isSecure, type };
  }, [parameter.type, constraints?.clearText]);

  // Memoize ConnectionParameterRow props
  const rowProps = useMemo(
    () => ({
      displayName: data?.displayName ?? parameterKey,
      tooltip: data?.tooltip,
      required: constraints?.required === 'true',
      disabled: isLoading,
    }),
    [data?.displayName, data?.tooltip, parameterKey, constraints?.required, isLoading]
  );

  // Memoize callback handlers
  const onManagedIdentityChange = useCallback(
    (_: any, option?: IDropdownOption<any>) => {
      const identitySelected = option?.key.toString() !== constants.SYSTEM_ASSIGNED_MANAGED_IDENTITY ? option?.key.toString() : undefined;
      setValue(identitySelected);
    },
    [setValue]
  );

  const onCheckboxChange = useCallback(
    (_e: any, checked?: boolean) => {
      setValue(checked);
    },
    [setValue]
  );

  const onDropdownChange = useCallback(
    (_e: any, newVal?: IDropdownOption) => {
      setValue(newVal?.data ?? newVal?.text);
    },
    [setValue]
  );

  const onTextFieldChange = useCallback(
    (_e: any, newVal?: string) => {
      setValue(newVal);
    },
    [setValue]
  );

  // Handle default values in useEffect to avoid setState during render
  useEffect(() => {
    if (parameter?.type === ConnectionParameterTypes.bool && value === undefined) {
      setValue(false);
    }

    if ((constraints?.allowedValues?.length ?? 0) > 0 && selectedKey === -1 && constraints?.allowedValues?.[0]) {
      setValue(constraints.allowedValues[0].value);
    }
  }, [parameter?.type, value, constraints?.allowedValues, setValue, selectedKey]);

  // Memoize the input component based on parameter type and relevant props
  const inputComponent = useMemo(() => {
    // Gateway setting parameter
    if (parameter?.type === ConnectionParameterTypes.gatewaySetting) {
      return (
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
    if (equals(constraints?.editor, 'identitypicker')) {
      return <LegacyManagedIdentityDropdown identity={identity} onChange={onManagedIdentityChange} disabled={isLoading} />;
    }

    // Boolean parameter
    if (parameter?.type === ConnectionParameterTypes.bool) {
      return <Checkbox checked={value} onChange={onCheckboxChange} label={description} />;
    }

    // Dropdown Parameter
    if (dropdownOptions.length > 0) {
      return (
        <Dropdown
          id={`connection-param-${parameterKey}`}
          className="connection-parameter-input"
          selectedKey={selectedKey}
          onChange={onDropdownChange}
          disabled={isLoading}
          ariaLabel={description}
          placeholder={description}
          required={constraints?.required === 'true'}
          options={dropdownOptions}
        />
      );
    }

    // Client Certificate Parameter
    if (parameter?.type === ConnectionParameterTypes.clientCertificate) {
      return <ClientSecretInput isLoading={isLoading} parameterKey={parameterKey} setValue={setValue} value={value} />;
    }

    // Text Input Parameter
    const { type } = textFieldConfig;

    return (
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
        onChange={onTextFieldChange}
      />
    );
  }, [
    parameter?.type,
    parameterKey,
    selectedSubscriptionId,
    selectSubscriptionCallback,
    availableGateways,
    availableSubscriptions,
    isSubscriptionDropdownDisabled,
    isLoading,
    setValue,
    value,
    constraints?.editor,
    constraints?.required,
    identity,
    description,
    selectedKey,
    dropdownOptions,
    textFieldConfig,
    onManagedIdentityChange,
    onCheckboxChange,
    onDropdownChange,
    onTextFieldChange,
  ]);

  return (
    <ConnectionParameterRow parameterKey={parameterKey} {...rowProps}>
      {inputComponent}
    </ConnectionParameterRow>
  );
};
