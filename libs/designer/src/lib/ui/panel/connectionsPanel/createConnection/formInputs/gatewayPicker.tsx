import { Dropdown, type DropdownProps, Option, makeStyles, shorthands } from '@fluentui/react-components';
import type { Gateway, Subscription } from '@microsoft/logic-apps-shared';
import React, { useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';

interface Options {
  key: string;
  text: string;
}

const useGatewayPickerStyles = makeStyles({
  dropdownContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: 'inherit',
  },
  dropdown: {
    borderRadius: '0',
    ...shorthands.borderColor('black'),
    ...shorthands.borderWidth('1px'),
    ':hover': {
      ...shorthands.borderColor('black'),
      ...shorthands.borderWidth('1px'),
    },
  },
});

const GatewayPicker = (props: any) => {
  const {
    parameterKey,
    selectedSubscriptionId,
    selectSubscriptionCallback,
    availableGateways,
    availableSubscriptions,
    isSubscriptionDropdownDisabled,
    isLoading,
    value,
    setValue,
  } = props;

  const intl = useIntl();
  const styles = useGatewayPickerStyles();

  const [selectedGatewayOptions, setSelectedGatewayOptions] = React.useState<string[]>(value ? [value] : []);

  const newGatewayUrl = 'http://aka.ms/logicapps-installgateway';
  const newGatewayOption = useMemo(
    () => ({
      key: newGatewayUrl,
      text: intl.formatMessage(
        {
          defaultMessage: '{addIcon} Install gateway',
          id: 'h+ZYip',
          description: 'Option to install a new gateway, links to new page',
        },
        { addIcon: '+ ' }
      ),
    }),
    [intl]
  );

  const subscriptionOptions: Options[] = useMemo<Options[]>(
    () =>
      (availableSubscriptions ?? [])
        .map((subscription: Subscription) => ({
          key: subscription.id,
          text: subscription.displayName,
        }))
        .sort((a: any, b: any) => a.text.localeCompare(b.text)),
    [availableSubscriptions]
  );

  const gatewayOptions: Options[] = useMemo<Options[]>(
    () => [
      ...(availableGateways ?? [])
        .map((gateway: Gateway) => ({
          key: gateway.id,
          text: gateway.properties.displayName ?? '',
        }))
        .sort((a: any, b: any) => a.text.localeCompare(b.text)),
      newGatewayOption,
    ],
    [availableGateways, newGatewayOption]
  );

  useEffect(() => {
    if (gatewayOptions && value) {
      const gate = gatewayOptions.find((gt) => gt.text === value.id);
      setSelectedGatewayOptions(gate ? [gate.key] : []);
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
    } else if (newVal?.optionText !== undefined) {
      setValue({ id: newVal?.optionText.toString() });
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
            positioning={{ fallbackPositions: ['below', 'above'] }}
            size="small"
          >
            {subscriptionOptions.map((option) => (
              <Option key={option.text} value={option.key}>
                {option.text}
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
          placeholder={gatewayDropdownLabel}
          selectedOptions={selectedGatewayOptions}
          positioning={{ fallbackPositions: ['below', 'above'] }}
          aria-label={gatewayDropdownLabel}
          size="small"
        >
          {gatewayOptions.map((option) => (
            <Option key={option.key} value={option.key}>
              {option.text}
            </Option>
          ))}
        </Dropdown>
      </div>
    </div>
  );
};

export default GatewayPicker;
