import { Dropdown, type DropdownProps, Option, makeStyles, shorthands } from '@fluentui/react-components';
import type { Gateway, Subscription } from '@microsoft/logic-apps-shared';
import React, { useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';

const useGatewayPickerStyles = makeStyles({
  dropdownContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: 'inherit',
  },
  dropdown: {
    ...shorthands.borderRadius('0px'),
    ...shorthands.borderColor('black'),
    ...shorthands.borderWidth('1px'),
    ':hover': {
      ...shorthands.borderColor('black'),
      ...shorthands.borderWidth('1px'),
    },
  },
});

type GatewaysWithNewOption = (Gateway | NewGatewayOption)[];

type NewGatewayOption = { id: string; properties: { displayName: string } };

export interface GatewayPickerProps {
  parameterKey: string;
  selectedSubscriptionId: string | undefined;
  selectSubscriptionCallback: ((subscriptionId: string) => void) | undefined;
  availableGateways: any; // type hint:Gateway[] | undefined
  availableSubscriptions: any; // type hint: Subscription[] | undefined
  isSubscriptionDropdownDisabled: boolean | undefined;
  isLoading: boolean | undefined;
  value: any;
  setValue: (value: any) => void;
}

export const GatewayPicker = (props: GatewayPickerProps) => {
  const {
    parameterKey,
    selectedSubscriptionId,
    selectSubscriptionCallback,
    isSubscriptionDropdownDisabled,
    isLoading,
    value,
    setValue, // accepts full gateway path as ID ex: /subscriptions/{subscription-GUID}/resourceGroups/{RG-name}/providers/Microsoft.Web/connectionGateways/daniellesGateway
  } = props;

  const availableSubscriptions = props.availableSubscriptions as Subscription[] | undefined;
  const availableGateways = props.availableGateways as Gateway[] | undefined;

  const intl = useIntl();
  const styles = useGatewayPickerStyles();

  const [selectedGatewayOptions, setSelectedGatewayOptions] = React.useState<string[]>(value ? [value] : []);
  const [gatewayValue, setGatewayValue] = React.useState<string | undefined>(value?.text);

  const newGatewayUrl = 'http://aka.ms/logicapps-installgateway';
  const newGatewayOption = useMemo<NewGatewayOption>(
    () => ({
      id: newGatewayUrl,
      properties: {
        displayName: intl.formatMessage(
          {
            defaultMessage: '{addIcon} Install gateway',
            id: 'h+ZYip',
            description: 'Option to install a new gateway, links to new page',
          },
          { addIcon: '+ ' }
        ),
      },
    }),
    [intl]
  );

  const subscriptionOptions: Subscription[] = useMemo<Subscription[]>(
    () => (availableSubscriptions ?? []).sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [availableSubscriptions]
  );

  const gatewayOptions = useMemo<GatewaysWithNewOption>(() => {
    const sorted: GatewaysWithNewOption = [
      ...(availableGateways ?? []).sort((a, b) => a.properties.displayName.localeCompare(b.properties.displayName)),
    ];
    sorted.push(newGatewayOption);
    return sorted;
  }, [availableGateways, newGatewayOption]);

  useEffect(() => {
    if (gatewayOptions && value) {
      const gate = gatewayOptions.find((gt) => gt.id === value.id);
      setSelectedGatewayOptions(gate ? [gate.id] : []);
    }
  }, [value, gatewayOptions]);

  const subscriptionDropdownLabel = intl.formatMessage({
    defaultMessage: 'Subscription',
    id: 'bIyTi7',
    description: 'Subscription dropdown label',
  });

  const gatewayDropdownLabel = intl.formatMessage({
    defaultMessage: 'Gateway',
    id: 'juvF+0',
    description: 'Gateway dropdown label',
  });

  const gatewayDropdownId = `connection-param-${parameterKey}-gateways`;
  const subscriptionDropdownId = `connection-param-${parameterKey}-gateways`;

  const onSubscriptionSelect: DropdownProps['onOptionSelect'] = (e, newVal) => {
    selectSubscriptionCallback?.(newVal.optionValue as string);
  };
  const onGatewaySelect: DropdownProps['onOptionSelect'] = (e, newVal) => {
    if (newVal?.optionValue === newGatewayUrl) {
      window.open(newGatewayUrl, '_blank');
      setSelectedGatewayOptions([newGatewayUrl]);
      setGatewayValue(newVal.optionText);
    } else if (newVal?.optionText !== undefined && newVal?.optionValue !== undefined) {
      setSelectedGatewayOptions([newVal.optionValue]);
      setValue({ id: newVal?.optionValue });
      setGatewayValue(newVal.optionText);
    }
  };

  return (
    <div style={{ width: 'inherit' }}>
      {!isSubscriptionDropdownDisabled && (
        <div className={styles.dropdownContainer}>
          <label id={subscriptionDropdownId}>{subscriptionDropdownLabel}</label>
          <Dropdown
            className={styles.dropdown}
            id={subscriptionDropdownId}
            onOptionSelect={onSubscriptionSelect}
            disabled={isLoading}
            aria-label={subscriptionDropdownLabel}
            placeholder={subscriptionDropdownLabel}
            positioning={{ fallbackPositions: ['below', 'above'] }} // Fluent UI type error here but configuration is respected during runtime
            size="small"
          >
            {subscriptionOptions.map((option) => (
              <Option key={option.id} value={option.id}>
                {option.displayName}
              </Option>
            ))}
          </Dropdown>
        </div>
      )}
      <div className={styles.dropdownContainer}>
        <label id={gatewayDropdownId}>{gatewayDropdownLabel}</label>
        <Dropdown
          id={gatewayDropdownId}
          className={styles.dropdown}
          onOptionSelect={onGatewaySelect}
          disabled={isLoading || !(selectedSubscriptionId || isSubscriptionDropdownDisabled)}
          value={gatewayValue ?? gatewayDropdownLabel}
          placeholder={gatewayDropdownLabel}
          selectedOptions={selectedGatewayOptions}
          positioning={{ fallbackPositions: ['below', 'above'] }} // Fluent UI type error here but configuration is respected during runtime
          aria-label={gatewayDropdownLabel}
          size="small"
        >
          {gatewayOptions.map((option) => (
            <Option key={option.id} value={option.id}>
              {option.properties.displayName}
            </Option>
          ))}
        </Dropdown>
      </div>
    </div>
  );
};

export default GatewayPicker;
