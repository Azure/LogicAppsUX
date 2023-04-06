import type { AzureResourcePickerProps } from '../azureResourcePicker';
import { AzureResourcePicker } from '../azureResourcePicker';
import { filterRecord } from '../utils';
import { UniversalConnectionParameter } from './universalConnectionParameter';
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
  ConnectionParameterSet,
  ConnectionParameterSetParameter,
  ConnectionParameterSets,
  Gateway,
  Subscription,
} from '@microsoft/utils-logic-apps';
import {
  Capabilities,
  ConnectionParameterTypes,
  SERVICE_PRINCIPLE_CONSTANTS,
  connectorContainsAllServicePrinicipalConnectionParameters,
  isServicePrinicipalConnectionParameter,
} from '@microsoft/utils-logic-apps';
import type { FormEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

export interface CreateConnectionProps {
  connectorDisplayName: string;
  connectorCapabilities?: string[];
  connectionParameters?: Record<string, ConnectionParameter>;
  connectionParameterSets?: ConnectionParameterSets;
  isLoading?: boolean;
  createConnectionCallback?: (
    newName?: string,
    selectedParameterSet?: ConnectionParameterSet,
    parameterValues?: Record<string, any>,
    isOAuthConnection?: boolean
  ) => void;
  cancelCallback?: () => void;
  hideCancelButton?: boolean;
  errorMessage?: string;
  clearErrorCallback?: () => void;
  selectSubscriptionCallback?: (subscriptionId: string) => void;
  selectedSubscriptionId?: string;
  availableSubscriptions?: Subscription[];
  availableGateways?: Gateway[];
  checkOAuthCallback: (parameters: Record<string, ConnectionParameter>) => boolean;
  resourceSelectedProps?: AzureResourcePickerProps;
}

type ParamType = ConnectionParameter | ConnectionParameterSetParameter;

export const CreateConnection = (props: CreateConnectionProps): JSX.Element => {
  const {
    connectorDisplayName,
    connectorCapabilities,
    connectionParameters,
    connectionParameterSets,
    isLoading,
    createConnectionCallback,
    cancelCallback,
    hideCancelButton = false,
    errorMessage,
    clearErrorCallback,
    selectSubscriptionCallback,
    selectedSubscriptionId,
    availableSubscriptions,
    availableGateways,
    checkOAuthCallback,
    resourceSelectedProps,
  } = props;

  const intl = useIntl();

  const [parameterValues, setParameterValues] = useState<Record<string, any>>({});

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

  const singleAuthParams = useMemo(() => connectionParameters ?? {}, [connectionParameters]);
  const multiAuthParams = useMemo(
    () => connectionParameterSets?.values[selectedParamSetIndex].parameters ?? {},
    [connectionParameterSets, selectedParamSetIndex]
  );
  const isMultiAuth = useMemo(() => (connectionParameterSets?.values?.length ?? 0) > 1, [connectionParameterSets?.values]);

  const isOnlyGatewayCapable = useCallback(
    (capabilities: string[] = []) =>
      (capabilities?.includes(Capabilities[Capabilities.gateway]) && !capabilities?.includes(Capabilities[Capabilities.cloud])) ?? false,
    []
  );

  const hasOnlyOnPremGateway = useMemo(() => isOnlyGatewayCapable(connectorCapabilities), [connectorCapabilities, isOnlyGatewayCapable]);

  const [enabledCapabilities, setEnabledCapabilities] = useState<Capabilities[]>([]);
  const toggleCapability = useCallback(
    (capability: Capabilities) => {
      if (enabledCapabilities.includes(capability)) {
        setEnabledCapabilities(enabledCapabilities.filter((c) => c !== capability));
      } else {
        setEnabledCapabilities([...enabledCapabilities, capability]);
      }
    },
    [enabledCapabilities]
  );

  const supportsServicePrincipalConnection = useMemo(
    () => connectorContainsAllServicePrinicipalConnectionParameters(singleAuthParams),
    [singleAuthParams]
  );

  const showServicePrincipalButton = useMemo(() => supportsServicePrincipalConnection, [supportsServicePrincipalConnection]);
  const [useServicePrincipal, setUseServicePrincipal] = useState<boolean>(false);
  const toggleServicePrincipal = () => {
    setUseServicePrincipal(!useServicePrincipal);
  };

  const isParamVisible = useCallback(
    (key: string, parameter: ParamType) => {
      const constraints = parameter?.uiDefinition?.constraints;
      if (useServicePrincipal) return isServicePrinicipalConnectionParameter(key) && isServicePrincipalParameterVisible(key, parameter);
      if (constraints?.hidden === 'true' || constraints?.hideInUI === 'true') return false;
      const dependencyParam = constraints?.dependentParameter;
      if (dependencyParam && parameterValues[dependencyParam.parameter] !== dependencyParam.value) return false;
      if (parameter.type === ConnectionParameterTypes[ConnectionParameterTypes.oauthSetting]) return false;
      return true;
    },
    [parameterValues, useServicePrincipal]
  );

  const unfilteredParameters: Record<string, ConnectionParameterSetParameter | ConnectionParameter> = useMemo(
    () => (isMultiAuth ? { ...multiAuthParams } : { ...singleAuthParams }) ?? {},
    [isMultiAuth, multiAuthParams, singleAuthParams]
  );

  const parameters: Record<string, ConnectionParameterSetParameter | ConnectionParameter> = useMemo(
    () => filterRecord<any>(unfilteredParameters, (key, value) => isParamVisible(key, value)),
    [isParamVisible, unfilteredParameters]
  );

  // Parameters record, under a layer of singular capability, if it has none or more than one it's under "general"
  const parametersByCapability = useMemo(() => {
    const output: { [_: string]: { [_: string]: ConnectionParameter | ConnectionParameterSetParameter } } = {};
    Object.entries(parameters ?? {}).forEach(([key, parameter]) => {
      const capability =
        (parameter.uiDefinition?.constraints?.capability?.length ?? 0) === 1
          ? parameter.uiDefinition?.constraints?.capability?.[0] ?? 'general'
          : 'general';
      output[capability] = {
        ...output[capability],
        [key]: parameter,
      };
    });
    return output;
  }, [parameters]);

  const getParametersByCapability = useCallback(
    (capability: Capabilities) => parametersByCapability?.[Capabilities[capability]] ?? {},
    [parametersByCapability]
  );
  const capabilityEnabledParameters = useMemo(() => {
    let output: Record<string, ConnectionParameterSetParameter | ConnectionParameter> = parametersByCapability['general'];
    Object.entries(parametersByCapability).forEach(([capabilityText, parameters]) => {
      if (enabledCapabilities.map((c) => Capabilities[c]).includes(capabilityText))
        output = {
          ...output,
          ...parameters,
        };
    });
    return output ?? {};
  }, [enabledCapabilities, parametersByCapability]);

  // Don't show name for simple connections
  const showNameInput = useMemo(
    () => isMultiAuth || Object.keys(parametersByCapability['general'] ?? {}).length > 0,
    [isMultiAuth, parametersByCapability]
  );

  const hasOAuth = useMemo(
    () => checkOAuthCallback(isMultiAuth ? multiAuthParams : singleAuthParams) && !enabledCapabilities.includes(Capabilities.gateway),
    [checkOAuthCallback, enabledCapabilities, isMultiAuth, multiAuthParams, singleAuthParams]
  );

  const isUsingOAuth = useMemo(() => hasOAuth && !useServicePrincipal, [hasOAuth, useServicePrincipal]);

  const [connectionDisplayName, setConnectionDisplayName] = useState<string>('');
  const validParams = useMemo(() => {
    if (showNameInput && !connectionDisplayName) return false;
    if (
      resourceSelectedProps &&
      ((resourceSelectedProps?.fetchSubResourcesCallback && !resourceSelectedProps?.selectedSubResource) ||
        !resourceSelectedProps?.selectedResourceId)
    )
      return false;
    if (Object.keys(capabilityEnabledParameters ?? {}).length === 0) return true;
    return Object.entries(capabilityEnabledParameters).every(
      ([key, parameter]) => parameter?.uiDefinition?.constraints?.required !== 'true' || !!parameterValues[key]
    );
  }, [showNameInput, connectionDisplayName, resourceSelectedProps, capabilityEnabledParameters, parameterValues]);

  const canSubmit = useMemo(() => !isLoading && validParams, [isLoading, validParams]);

  const submitCallback = useCallback(() => {
    const visibleParameterValues = Object.fromEntries(
      Object.entries(parameterValues).filter(([key]) => Object.keys(capabilityEnabledParameters).includes(key)) ?? []
    );

    // This value needs to be passed conditionally but the parameter is hidden, so we're manually inputting it here
    if (
      supportsServicePrincipalConnection &&
      Object.keys(unfilteredParameters).includes(SERVICE_PRINCIPLE_CONSTANTS.CONFIG_ITEM_KEYS.TOKEN_GRANT_TYPE)
    ) {
      const oauthValue = SERVICE_PRINCIPLE_CONSTANTS.GRANT_TYPE_VALUES.CODE;
      const servicePrincipalValue = SERVICE_PRINCIPLE_CONSTANTS.GRANT_TYPE_VALUES.CLIENT_CREDENTIALS;
      visibleParameterValues[SERVICE_PRINCIPLE_CONSTANTS.CONFIG_ITEM_KEYS.TOKEN_GRANT_TYPE] = useServicePrincipal
        ? servicePrincipalValue
        : oauthValue;
    }

    return createConnectionCallback?.(
      showNameInput ? connectionDisplayName : '',
      connectionParameterSets?.values[selectedParamSetIndex],
      visibleParameterValues,
      isUsingOAuth
    );
  }, [
    parameterValues,
    supportsServicePrincipalConnection,
    unfilteredParameters,
    createConnectionCallback,
    showNameInput,
    connectionDisplayName,
    connectionParameterSets?.values,
    selectedParamSetIndex,
    isUsingOAuth,
    capabilityEnabledParameters,
    useServicePrincipal,
  ]);

  // INTL STRINGS

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

  const simpleDescriptionText = intl.formatMessage(
    {
      defaultMessage: 'Create a connection for {connectorName}.',
      description: 'Create a connection for selected connector',
    },
    {
      connectorName: connectorDisplayName,
    }
  );

  const authDescriptionText = intl.formatMessage(
    {
      defaultMessage: 'Sign in to create a connection to {connectorDisplayName}.',
      description: 'Description for creating an externally authenticated connection.',
    },
    { connectorDisplayName }
  );

  const signInButtonText = intl.formatMessage({
    defaultMessage: 'Sign in',
    description: 'Text for sign in button.',
  });

  const signInButtonAria = intl.formatMessage({
    defaultMessage: 'Sign in to connector',
    description: 'Aria label description for sign in button.',
  });

  const signInButtonLoadingText = intl.formatMessage({
    defaultMessage: 'Signing in...',
    description: 'Text for sign in button while loading.',
  });

  const closeErrorButtonAriaLabel = intl.formatMessage({
    defaultMessage: 'Close',
    description: 'Close button aria label',
  });

  const gatewayTooltipText = intl.formatMessage({
    defaultMessage: 'Select this if you are configuring an on-prem connection',
    description: 'Tooltip for on-prem gateway connection checkbox',
  });

  const servicePrincipalTooltipText = intl.formatMessage({
    defaultMessage: 'Use a service principal to connect using application permissions',
    description: 'Tooltip for service principal connection checkbox',
  });

  const servicePrincipalLearnMoreURL =
    'https://learn.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal';

  const learnMoreText = intl.formatMessage({
    defaultMessage: 'Learn more',
    description: 'Learn more link text',
  });

  const connectorDescription = useMemo(() => {
    if (isUsingOAuth) return authDescriptionText;
    if (Object.keys(parameters ?? {}).length === 0) return simpleDescriptionText;
    return '';
  }, [authDescriptionText, isUsingOAuth, parameters, simpleDescriptionText]);

  const submitButtonText = useMemo(() => {
    if (isLoading) return isUsingOAuth ? signInButtonLoadingText : createButtonLoadingText;
    return isUsingOAuth ? signInButtonText : createButtonText;
  }, [createButtonLoadingText, createButtonText, isLoading, isUsingOAuth, signInButtonLoadingText, signInButtonText]);

  const submitButtonAriaLabel = useMemo(() => {
    return isUsingOAuth ? signInButtonAria : createButtonAria;
  }, [isUsingOAuth, signInButtonAria, createButtonAria]);

  const showConfigParameters = useMemo(() => !resourceSelectedProps, [resourceSelectedProps]);

  // RENDER

  return (
    <div className="msla-create-connection-container">
      {/* Error Bar */}
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

      {/* Parameters */}
      <div className="connection-params-container">
        {/* ServicePrincipal support */}
        {showServicePrincipalButton && (
          <div className="param-row center" style={{ margin: '8px 0px' }}>
            <Checkbox
              label={intl.formatMessage({
                defaultMessage: 'Connect via Service Principal',
                description: 'Checkbox label for using an Service Pricipal connection',
              })}
              checked={useServicePrincipal}
              onChange={() => toggleServicePrincipal()}
              disabled={isLoading}
            />
            <TooltipHost
              content={
                <div>
                  <p>{servicePrincipalTooltipText}</p>
                  <a href={servicePrincipalLearnMoreURL}>{learnMoreText}</a>
                </div>
              }
            >
              <Icon iconName="Info" style={{ marginLeft: '4px', transform: 'translate(0px, 2px)' }} />
            </TooltipHost>
          </div>
        )}

        {/* Name */}
        {showNameInput && (
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
        )}

        {/* Authentication Selection */}
        {isMultiAuth && (
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
        {showConfigParameters &&
          Object.entries(parametersByCapability['general'] ?? {})?.map(
            ([key, parameter]: [string, ConnectionParameterSetParameter | ConnectionParameter]) => (
              <UniversalConnectionParameter
                key={key}
                parameterKey={key}
                parameter={parameter}
                value={parameterValues[key]}
                setValue={(val: any) => setParameterValues({ ...parameterValues, [key]: val })}
                isLoading={isLoading}
                selectedSubscriptionId={selectedSubscriptionId}
                selectSubscriptionCallback={selectSubscriptionCallback}
                availableGateways={availableGateways}
                availableSubscriptions={availableSubscriptions}
              />
            )
          )}

        {!hasOnlyOnPremGateway && Object.keys(getParametersByCapability(Capabilities.gateway)).length > 0 && (
          <>
            {/* OptionalGateway Checkbox */}
            <div className="param-row center" style={{ margin: '8px 0px' }}>
              <Checkbox
                label={intl.formatMessage({
                  defaultMessage: 'Connect via on-premises data gateway',
                  description: 'Checkbox label for using an on-premises gateway',
                })}
                checked={enabledCapabilities.includes(Capabilities.gateway)}
                onChange={() => toggleCapability(Capabilities.gateway)}
                disabled={isLoading}
              />
              <TooltipHost content={gatewayTooltipText}>
                <Icon iconName="Info" style={{ marginLeft: '4px', transform: 'translate(0px, 2px)' }} />
              </TooltipHost>
            </div>
            {/* Gateway-Specific Parameters */}
            {showConfigParameters &&
              enabledCapabilities.includes(Capabilities.gateway) &&
              Object.entries(getParametersByCapability(Capabilities.gateway))?.map(
                ([key, parameter]: [string, ConnectionParameterSetParameter | ConnectionParameter]) => (
                  <UniversalConnectionParameter
                    key={key}
                    parameterKey={key}
                    parameter={parameter}
                    value={parameterValues[key]}
                    setValue={(val: any) => setParameterValues({ ...parameterValues, [key]: val })}
                    isLoading={isLoading}
                    selectedSubscriptionId={selectedSubscriptionId}
                    selectSubscriptionCallback={selectSubscriptionCallback}
                    availableGateways={availableGateways}
                    availableSubscriptions={availableSubscriptions}
                  />
                )
              )}
          </>
        )}

        {/* Resource Selector UI */}
        {resourceSelectedProps && <AzureResourcePicker {...resourceSelectedProps} />}
      </div>

      {/* Descriptor text for simple and oauth */}
      <div>{connectorDescription}</div>
      {/* {needsAuth && <IFrameTermsOfService url={termsOfServiceUrl} />} */}

      {/* Action Buttons */}
      <div className="msla-create-connection-actions-container">
        <PrimaryButton disabled={!canSubmit} text={submitButtonText} ariaLabel={submitButtonAriaLabel} onClick={submitCallback} />
        {!hideCancelButton ? (
          <DefaultButton disabled={isLoading} text={cancelButtonText} ariaLabel={cancelButtonAria} onClick={cancelCallback} />
        ) : null}
      </div>
    </div>
  );
};

const isServicePrincipalParameterVisible = (key: string, parameter: any): boolean => {
  const hiddenOverrrideKeys = {
    TOKEN_CLIENT_ID: 'token:clientId',
    TOKEN_CLIENT_SECRET: 'token:clientSecret',
    TOKEN_TENANT_ID: 'token:tenantId',
  };
  if (
    Object.values(hiddenOverrrideKeys)
      .map((key) => key.toLowerCase())
      .includes(key.toLowerCase())
  )
    return true;
  const constraints = parameter?.uiDefinition?.constraints;
  if (constraints?.hidden === 'true' || constraints?.hideInUI === 'true') return false;
  return true;
};
