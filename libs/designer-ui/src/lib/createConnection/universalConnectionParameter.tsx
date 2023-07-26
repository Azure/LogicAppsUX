import GatewayPicker from './gatewayPicker';
import type { IDropdownOption } from '@fluentui/react';
import { Checkbox, Dropdown, TextField, Label, TooltipHost, Icon } from '@fluentui/react';
import type { ConnectionParameter, ConnectionParameterAllowedValue } from '@microsoft/utils-logic-apps';
import { ConnectionParameterTypes } from '@microsoft/utils-logic-apps';

export interface ConnectionParameterProps {
  parameterKey: string;
  parameter: ConnectionParameter;
  value: any;
  setValue: (value: any) => void;
  isLoading?: boolean;
  selectedSubscriptionId?: string;
  selectSubscriptionCallback?: (subscriptionId: string) => void;
  availableGateways?: any[];
  availableSubscriptions?: any[];
}

export const UniversalConnectionParameter = (props: ConnectionParameterProps) => {
  const {
    parameterKey,
    parameter,
    value,
    setValue,
    isLoading,
    selectedSubscriptionId,
    selectSubscriptionCallback,
    availableGateways,
    availableSubscriptions,
  } = props;

  const data = parameter?.uiDefinition;
  const description = data?.description ?? data?.schema?.description;
  const constraints = parameter?.uiDefinition?.constraints;
  let inputComponent = undefined;

  // Gateway setting parameter
  if (parameter?.type === ConnectionParameterTypes[ConnectionParameterTypes.gatewaySetting]) {
    inputComponent = (
      <GatewayPicker
        parameterKey={parameterKey}
        selectedSubscriptionId={selectedSubscriptionId}
        selectSubscriptionCallback={selectSubscriptionCallback}
        availableGateways={availableGateways}
        availableSubscriptions={availableSubscriptions}
        isLoading={isLoading}
        setValue={setValue}
        value={value}
      />
    );
  }

  // Boolean parameter
  else if (parameter?.type === ConnectionParameterTypes[ConnectionParameterTypes.bool]) {
    if (value === undefined) setValue(false);
    inputComponent = <Checkbox checked={value} onChange={(e: any, checked?: boolean) => setValue(checked)} label={description} />;
  }

  // Dropdown Parameter
  else if ((constraints?.allowedValues?.length ?? 0) > 0) {
    const selectedKey = constraints?.allowedValues?.findIndex((_value) => _value.value === value);
    if (selectedKey === -1) setValue(constraints?.allowedValues?.[0].value);
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
    <div key={parameterKey} className="param-row">
      <Label className="label" required={constraints?.required === 'true'} htmlFor={parameterKey} disabled={isLoading}>
        {data?.displayName ?? parameterKey}
        {data?.tooltip && (
          <TooltipHost content={data?.tooltip}>
            <Icon iconName="Info" style={{ marginLeft: '4px', transform: 'translate(0px, 2px)' }} />
          </TooltipHost>
        )}
      </Label>
      {inputComponent}
    </div>
  );
};
