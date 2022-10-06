import { filterRecord } from '../utils';
import { ConnectionAuth } from './auth';
import type { IDropdownOption } from '@fluentui/react';
import {
  MessageBarType,
  MessageBar,
  Checkbox,
  DefaultButton,
  Dropdown,
  Icon,
  Label,
  PrimaryButton,
  TextField,
  TooltipHost,
} from '@fluentui/react';
import type {
  ConnectionParameter,
  ConnectionParameterAllowedValue,
  ConnectionParameterSet,
  ConnectionParameterSetParameter,
  ConnectionParameterSets,
  Gateway,
  Subscription,
} from '@microsoft-logic-apps/utils';
import { ConnectionParameterTypes } from '@microsoft-logic-apps/utils';
import type { FormEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

export interface CreateConnectionProps {
  connectorDisplayName: string;
  connectionParameters?: Record<string, ConnectionParameter>;
  connectionParameterSets?: ConnectionParameterSets;
  isLoading?: boolean;
  createConnectionCallback?: (
    newName: string,
    selectedParameterSet?: ConnectionParameterSet,
    parameterValues?: Record<string, any>
  ) => void;
  cancelCallback?: () => void;
  authClickCallback?: () => void;
  hideCancelButton?: boolean;
  needsAuth?: boolean;
  errorMessage?: string;
  clearErrorCallback?: () => void;
  selectSubscriptionCallback?: (subscriptionId: string) => void;
  selectedSubscriptionId?: string;
  availableSubscriptions?: Subscription[];
  availableGateways?: Gateway[];
}

type ParamType = ConnectionParameter | ConnectionParameterSetParameter;

export const CreateConnection = (props: CreateConnectionProps): JSX.Element => {
  const {
    connectorDisplayName,
    connectionParameters,
    connectionParameterSets,
    isLoading,
    createConnectionCallback,
    cancelCallback,
    authClickCallback,
    hideCancelButton = false,
    needsAuth = false,
    errorMessage,
    clearErrorCallback,
    selectSubscriptionCallback,
    selectedSubscriptionId,
    availableSubscriptions,
    availableGateways,
  } = props;

  const intl = useIntl();

  const [selectedParamSetIndex, setSelectedParamSetIndex] = useState<number>(0);
  const onAuthDropdownChange = useCallback(
    (_event: FormEvent<HTMLDivElement>, item: any): void => {
      if (item.key !== selectedParamSetIndex) {
        setSelectedParamSetIndex(item.key as number);
        setParameterValues({}); // Clear out the config params from previous set
      }
    },
    [selectedParamSetIndex]
  );

  const singleAuthParams = connectionParameters;
  const multiAuthParams = useMemo(
    () => connectionParameterSets?.values[selectedParamSetIndex].parameters,
    [connectionParameterSets, selectedParamSetIndex]
  );
  const parameters = useMemo(() => multiAuthParams ?? singleAuthParams ?? {}, [multiAuthParams, singleAuthParams]);

  const [connectionDisplayName, setConnectionDisplayName] = useState<string>('');
  const [parameterValues, setParameterValues] = useState<Record<string, any>>({});

  const isParamVisible = useCallback(
    (parameter: ParamType) => {
      const constraints = parameter?.uiDefinition?.constraints;
      if (constraints?.hidden || constraints?.hideInUI) return false;
      const dependencyParam = constraints?.dependentParameter;
      if (dependencyParam && parameterValues[dependencyParam.parameter] !== dependencyParam.value) return false;
      return true;
    },
    [parameterValues]
  );

  const validParams = useMemo(() => {
    return Object.entries(parameters).every(
      ([key, parameter]) =>
        parameter?.uiDefinition?.constraints?.required !== 'true' || !isParamVisible(parameter) || !!parameterValues[key]
    );
  }, [isParamVisible, parameterValues, parameters]);

  const canSubmit = !isLoading && !!connectionDisplayName && validParams;

  const inputConnectionDisplayNameLabel = intl.formatMessage({
    defaultMessage: 'Connection Name',
    description: 'Connection Name',
  });

  const inputConnectionDisplayNamePlaceholder = intl.formatMessage({
    defaultMessage: 'Enter a name for the connection',
    description: 'Placeholder text for connection name input',
  });

  const createButtonText = intl.formatMessage({
    defaultMessage: 'Create New',
    description: 'Button to add a new connection',
  });

  const createButtonLoadingText = intl.formatMessage({
    defaultMessage: 'Creating...',
    description: 'Button text to show a connection is being created',
  });

  const createButtonAria = intl.formatMessage({
    defaultMessage: 'Create a new connection',
    description: 'aria label description for create button',
  });

  const cancelButtonText = intl.formatMessage({
    defaultMessage: 'Cancel',
    description: 'Button to cancel creating a connection',
  });

  const cancelButtonAria = intl.formatMessage({
    defaultMessage: 'Cancel creating a connection',
    description: 'aria label description for cancel button',
  });

  const componentSimpleDescription = intl.formatMessage(
    {
      defaultMessage: 'Create a connection for {connectorName}.',
      description: 'Create a connection for selected connector',
    },
    {
      connectorName: connectorDisplayName,
    }
  );

  const subscriptionDropdownLabel = intl.formatMessage({
    defaultMessage: 'Subscription',
    description: 'Subscription dropdown label',
  });

  const gatewayDropdownLabel = intl.formatMessage({
    defaultMessage: 'Gateway',
    description: 'Gateway dropdown label',
  });

  const closeErrorButtonAriaLabel = intl.formatMessage({
    defaultMessage: 'Close',
    description: 'Close button aria label',
  });

  const getVisibleParameterValues = useCallback(() => {
    return filterRecord(parameterValues, ([key]) => isParamVisible(parameters[key]));
  }, [isParamVisible, parameterValues, parameters]);

  const submitCallback = useCallback(() => {
    return createConnectionCallback?.(
      connectionDisplayName,
      connectionParameterSets?.values[selectedParamSetIndex],
      getVisibleParameterValues()
    );
  }, [createConnectionCallback, connectionDisplayName, connectionParameterSets?.values, selectedParamSetIndex, getVisibleParameterValues]);

  // AuthorizedConnector Component
  if (needsAuth)
    return (
      <ConnectionAuth
        connectorDisplayName={connectorDisplayName}
        isLoading={isLoading}
        authClickCallback={authClickCallback}
        cancelCallback={cancelCallback}
        hideCancelButton={hideCancelButton}
        errorMessage={errorMessage}
      />
    );

  // SimpleConnector component
  if (!(Object.keys(singleAuthParams ?? {}).length > 0 || Object.keys(multiAuthParams ?? {}).length > 0)) {
    return (
      <div className="msla-create-connection-container">
        <div>{componentSimpleDescription}</div>

        <div className="msla-create-connection-actions-container">
          <PrimaryButton
            disabled={isLoading}
            text={isLoading ? createButtonLoadingText : createButtonText}
            ariaLabel={createButtonAria}
            onClick={submitCallback}
          />
        </div>
      </div>
    );
  }

  // AssistedConnector Component
  // if (false) return <p>TODO:</p>

  // Configurable connector component
  return (
    <div className="msla-create-connection-container">
      {errorMessage && (
        <MessageBar
          messageBarType={MessageBarType.error}
          isMultiline={true}
          onDismiss={clearErrorCallback}
          dismissButtonAriaLabel={closeErrorButtonAriaLabel}
        >
          {errorMessage}
        </MessageBar>
      )}
      <div className="connection-params-container">
        <div className="param-row">
          <Label className="label" required htmlFor={'connection-display-name-input'} disabled={isLoading}>
            {inputConnectionDisplayNameLabel}
          </Label>
          <TextField
            id={'connection-display-name-input'}
            className="connection-parameter-input"
            disabled={isLoading}
            autoComplete="off"
            aria-label={inputConnectionDisplayNamePlaceholder}
            placeholder={inputConnectionDisplayNamePlaceholder}
            value={connectionDisplayName}
            onChange={(e: any, val?: string) => setConnectionDisplayName(val ?? '')}
          />
        </div>

        {/* Authentication Selection */}
        {Object.keys(multiAuthParams ?? {}).length > 0 && multiAuthParams && (
          <div className="param-row">
            <Label className="label" required htmlFor={'connection-param-set-select'} disabled={isLoading}>
              {connectionParameterSets?.uiDefinition?.displayName}
            </Label>
            <Dropdown
              id="connection-param-set-select"
              className="connection-parameter-input"
              selectedKey={selectedParamSetIndex}
              onChange={onAuthDropdownChange}
              disabled={isLoading}
              ariaLabel={connectionParameterSets?.uiDefinition?.description}
              placeholder={connectionParameterSets?.uiDefinition?.description}
              options={
                connectionParameterSets?.values.map((paramSet, index) => ({
                  key: index,
                  text: paramSet?.uiDefinition?.displayName,
                })) ?? []
              }
            />
          </div>
        )}

        {/* Connector Parameters */}
        {Object.entries(multiAuthParams ?? singleAuthParams ?? [])?.map(
          ([key, parameter]: [string, ConnectionParameterSetParameter | ConnectionParameter]) => {
            if (!isParamVisible(parameter)) return null;

            const data = parameter?.uiDefinition;
            const constraints = parameter?.uiDefinition?.constraints;
            let inputComponent = undefined;

            // Gateway setting parameter
            if (parameter?.type === ConnectionParameterTypes[ConnectionParameterTypes.gatewaySetting]) {
              const newGatewayUrl = 'http://aka.ms/logicapps-installgateway';
              const newGatewayOption: IDropdownOption<any> = {
                key: newGatewayUrl,
                text: intl.formatMessage(
                  {
                    defaultMessage: '{addIcon} Install Gateway',
                    description: 'Option to install a new gateway, links to new page',
                  },
                  { addIcon: '+ ' }
                ),
              };

              const gatewayOptions = [
                ...(availableGateways ?? [])
                  .map((gateway: Gateway) => ({
                    key: gateway.id,
                    text: gateway.properties.displayName ?? '',
                  }))
                  .sort((a, b) => a.text.localeCompare(b.text)),
                newGatewayOption,
              ];

              inputComponent = (
                <div style={{ width: 'inherit' }}>
                  <Dropdown
                    id={`connection-param-${key}-subscriptions`}
                    label={subscriptionDropdownLabel}
                    className="connection-parameter-input"
                    selectedKey={selectedSubscriptionId}
                    onChange={(e: any, newVal?: IDropdownOption) => selectSubscriptionCallback?.(newVal?.key as string)}
                    disabled={isLoading}
                    ariaLabel={subscriptionDropdownLabel}
                    placeholder={subscriptionDropdownLabel}
                    options={(availableSubscriptions ?? [])
                      .map((subscription: Subscription) => ({
                        key: subscription.id,
                        text: subscription.displayName,
                      }))
                      .sort((a, b) => a.text.localeCompare(b.text))}
                    styles={{ callout: { maxHeight: 300 } }}
                  />
                  <Dropdown
                    id={`connection-param-${key}-gateways`}
                    label={gatewayDropdownLabel}
                    className="connection-parameter-input"
                    selectedKey={parameterValues[key]?.id}
                    onChange={(e: any, newVal?: IDropdownOption) => {
                      if (newVal?.key === newGatewayUrl) {
                        window.open(newGatewayUrl, '_blank');
                      } else {
                        setParameterValues({ ...parameterValues, [key]: { id: newVal?.key.toString() } });
                      }
                    }}
                    disabled={isLoading || !selectedSubscriptionId}
                    ariaLabel={gatewayDropdownLabel}
                    placeholder={gatewayDropdownLabel}
                    options={gatewayOptions}
                    styles={{ callout: { maxHeight: 300 } }}
                  />
                </div>
              );
            }

            // Boolean parameter
            else if (parameter?.type === ConnectionParameterTypes[ConnectionParameterTypes.bool]) {
              inputComponent = (
                <Checkbox
                  checked={parameterValues[key]}
                  onChange={(e: any, checked?: boolean) => {
                    setParameterValues({ ...parameterValues, [key]: checked });
                  }}
                  label={data?.description}
                />
              );
            }

            // Dropdown Parameter
            else if ((constraints?.allowedValues?.length ?? 0) > 0) {
              inputComponent = (
                <Dropdown
                  id={`connection-param-${key}`}
                  className="connection-parameter-input"
                  selectedKey={constraints?.allowedValues?.findIndex((value) => value.text === parameterValues[key])}
                  onChange={(e: any, newVal?: IDropdownOption) => {
                    setParameterValues({ ...parameterValues, [key]: newVal?.text });
                  }}
                  disabled={isLoading}
                  ariaLabel={data?.description}
                  placeholder={data?.description}
                  options={(constraints?.allowedValues ?? []).map((allowedValue: ConnectionParameterAllowedValue, index) => ({
                    key: index,
                    text: allowedValue.text ?? '',
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
                  id={key}
                  className="connection-parameter-input"
                  disabled={isLoading}
                  autoComplete="off"
                  type={type}
                  canRevealPassword
                  ariaLabel={data?.description}
                  placeholder={data?.description}
                  value={parameterValues[key]}
                  onChange={(e: any, newVal?: string) => setParameterValues({ ...parameterValues, [key]: newVal })}
                />
              );
            }

            return (
              <div key={key} className="param-row">
                <Label className="label" required={constraints?.required === 'true'} htmlFor={key} disabled={isLoading}>
                  {data?.displayName}
                  <TooltipHost content={data?.tooltip}>
                    <Icon iconName="Info" style={{ marginLeft: '4px', transform: 'translate(0px, 2px)' }} />
                  </TooltipHost>
                </Label>
                {inputComponent}
              </div>
            );
          }
        )}
      </div>

      {/* Action Buttons */}
      <div className="msla-create-connection-actions-container">
        <PrimaryButton
          disabled={!canSubmit}
          text={isLoading ? createButtonLoadingText : createButtonText}
          ariaLabel={createButtonAria}
          onClick={submitCallback}
        />
        {!hideCancelButton ? (
          <DefaultButton disabled={isLoading} text={cancelButtonText} ariaLabel={cancelButtonAria} onClick={cancelCallback} />
        ) : null}
      </div>
    </div>
  );
};
