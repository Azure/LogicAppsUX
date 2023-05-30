import type { AzureResourcePickerProps } from '../azureResourcePicker';
import { AzureResourcePicker } from '../azureResourcePicker';
import { filterRecord } from '../utils';
import LegacyManagedIdentityDropdown from './legacyManagedIdentityPicker';
import { UniversalConnectionParameter } from './universalConnectionParameter';
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
  ConnectionParameterSet,
  ConnectionParameterSetParameter,
  ConnectionParameterSets,
  Gateway,
  ManagedIdentity,
  Subscription,
} from '@microsoft/utils-logic-apps';
import {
  Capabilities,
  ConnectionParameterTypes,
  SERVICE_PRINCIPLE_CONSTANTS,
  connectorContainsAllServicePrinicipalConnectionParameters,
  isServicePrinicipalConnectionParameter,
  usesLegacyManagedIdentity,
} from '@microsoft/utils-logic-apps';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

export interface CreateConnectionProps {
  connectorDisplayName: string;
  connectorCapabilities?: string[];
  connectionParameters?: Record<string, ConnectionParameter>;
  connectionParameterSets?: ConnectionParameterSets;
  connectionAlternativeParameters?: Record<string, ConnectionParameter>;
  identity?: ManagedIdentity;
  isLoading?: boolean;
  createConnectionCallback?: (
    newName?: string,
    selectedParameterSet?: ConnectionParameterSet,
    parameterValues?: Record<string, any>,
    isOAuthConnection?: boolean,
    alternativeParameterValues?: Record<string, any>,
    identitySelected?: string
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

enum LegacyMultiAuthOptions {
  oauth = 0,
  servicePrincipal = 1,
  managedIdentity = 2,
}

export const CreateConnection = (props: CreateConnectionProps): JSX.Element => {
  const {
    connectorDisplayName,
    connectorCapabilities,
    connectionParameters,
    connectionParameterSets,
    connectionAlternativeParameters,
    identity,
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

  const singleAuthParams = useMemo(
    () => ({
      ...(connectionParameters ?? {}),
      // ...connectionAlternativeParameters ?? {}, // TODO: Riley - This is where we would add in legacy MI params
    }),
    [connectionParameters]
  );
  const multiAuthParams = useMemo(
    () => connectionParameterSets?.values[selectedParamSetIndex].parameters ?? {},
    [connectionParameterSets, selectedParamSetIndex]
  );
  const isMultiAuth = useMemo(() => (connectionParameterSets?.values?.length ?? 0) > 1, [connectionParameterSets?.values]);

  const hasOnlyOnPremGateway = useMemo(
    () =>
      (connectorCapabilities?.includes(Capabilities[Capabilities.gateway]) &&
        !connectorCapabilities?.includes(Capabilities[Capabilities.cloud])) ??
      false,
    [connectorCapabilities]
  );

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

  useEffect(() => {
    if (hasOnlyOnPremGateway && !enabledCapabilities.includes(Capabilities.gateway)) toggleCapability(Capabilities.gateway);
  }, [enabledCapabilities, hasOnlyOnPremGateway, toggleCapability]);

  const supportsServicePrincipalConnection = useMemo(
    () => connectorContainsAllServicePrinicipalConnectionParameters(singleAuthParams),
    [singleAuthParams]
  );

  const supportsLegacyManagedIdentityConnection = useMemo(
    () => usesLegacyManagedIdentity(connectionAlternativeParameters),
    [connectionAlternativeParameters]
  );

  const showLegacyMultiAuth = useMemo(
    () => !isMultiAuth && (supportsServicePrincipalConnection || supportsLegacyManagedIdentityConnection),
    [isMultiAuth, supportsServicePrincipalConnection, supportsLegacyManagedIdentityConnection]
  );

  const servicePrincipalSelected = useMemo(
    () => showLegacyMultiAuth && selectedParamSetIndex === LegacyMultiAuthOptions.servicePrincipal,
    [selectedParamSetIndex, showLegacyMultiAuth]
  );

  const legacyManagedIdentitySelected = useMemo(
    () => showLegacyMultiAuth && selectedParamSetIndex === LegacyMultiAuthOptions.managedIdentity,
    [selectedParamSetIndex, showLegacyMultiAuth]
  );

  const [selectedManagedIdentity, setSelectedManagedIdentity] = useState<string | undefined>(undefined);

  const onLegacyManagedIdentityChange = useCallback((_: any, option?: IDropdownOption<any>) => {
    setSelectedManagedIdentity(option?.key.toString());
  }, []);

  const isParamVisible = useCallback(
    (key: string, parameter: ParamType) => {
      const constraints = parameter?.uiDefinition?.constraints;
      if (servicePrincipalSelected)
        return isServicePrinicipalConnectionParameter(key) && isServicePrincipalParameterVisible(key, parameter);
      if (legacyManagedIdentitySelected) return false; // TODO: Riley - Only show the managed identity parameters (which is none for now)
      if (constraints?.hidden === 'true' || constraints?.hideInUI === 'true') return false;
      const dependencyParam = constraints?.dependentParameter;
      if (dependencyParam && parameterValues[dependencyParam.parameter] !== dependencyParam.value) return false;
      if (parameter.type === ConnectionParameterTypes[ConnectionParameterTypes.oauthSetting]) return false;
      if (parameter.type === ConnectionParameterTypes[ConnectionParameterTypes.managedIdentity]) return false;
      return true;
    },
    [parameterValues, servicePrincipalSelected, legacyManagedIdentitySelected]
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

  const hasOAuth = useMemo(
    () => checkOAuthCallback(isMultiAuth ? multiAuthParams : singleAuthParams) && !enabledCapabilities.includes(Capabilities.gateway),
    [checkOAuthCallback, enabledCapabilities, isMultiAuth, multiAuthParams, singleAuthParams]
  );

  const isUsingOAuth = useMemo(
    () => hasOAuth && !servicePrincipalSelected && !legacyManagedIdentitySelected,
    [hasOAuth, servicePrincipalSelected, legacyManagedIdentitySelected]
  );

  // Don't show name for simple connections
  const showNameInput = useMemo(
    () => !(isUsingOAuth && !isMultiAuth) && (isMultiAuth || Object.keys(capabilityEnabledParameters ?? {}).length > 0 || legacyManagedIdentitySelected),
    [isUsingOAuth, isMultiAuth, capabilityEnabledParameters, legacyManagedIdentitySelected]
  );

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
      visibleParameterValues[SERVICE_PRINCIPLE_CONSTANTS.CONFIG_ITEM_KEYS.TOKEN_GRANT_TYPE] = servicePrincipalSelected
        ? servicePrincipalValue
        : oauthValue;
    }

    const alternativeParameterValues = legacyManagedIdentitySelected ? {} : undefined;
    const identitySelected = legacyManagedIdentitySelected ? selectedManagedIdentity : undefined;

    return createConnectionCallback?.(
      showNameInput ? connectionDisplayName : undefined,
      connectionParameterSets?.values[selectedParamSetIndex],
      visibleParameterValues,
      isUsingOAuth,
      alternativeParameterValues,
      identitySelected
    );
  }, [
    parameterValues,
    supportsServicePrincipalConnection,
    unfilteredParameters,
    legacyManagedIdentitySelected,
    selectedManagedIdentity,
    createConnectionCallback,
    showNameInput,
    connectionDisplayName,
    connectionParameterSets?.values,
    selectedParamSetIndex,
    isUsingOAuth,
    capabilityEnabledParameters,
    servicePrincipalSelected,
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

  const legacyMultiAuthLabelText = intl.formatMessage({
    defaultMessage: 'Authentication',
    description: 'Label for legacy multi auth dropdown',
  });

  const oAuthDropdownText = intl.formatMessage({
    defaultMessage: 'OAuth',
    description: 'Dropdown text for OAuth connection',
  });

  const servicePrincipalDropdownText = intl.formatMessage({
    defaultMessage: 'Service Principal',
    description: 'Dropdown text for service principal connection',
  });

  const legacyManagedIdentityDropdownText = intl.formatMessage({
    defaultMessage: 'Managed Identity',
    description: 'Dropdown text for legacy managed identity connection',
  });

  const legacyMultiAuthOptions: IDropdownOption<any>[] = useMemo(() => {
    return [
      {
        key: LegacyMultiAuthOptions.oauth,
        text: oAuthDropdownText,
      },
      supportsServicePrincipalConnection
        ? {
            key: LegacyMultiAuthOptions.servicePrincipal,
            text: servicePrincipalDropdownText,
          }
        : undefined,
      supportsLegacyManagedIdentityConnection
        ? {
            key: LegacyMultiAuthOptions.managedIdentity,
            text: legacyManagedIdentityDropdownText,
          }
        : undefined,
    ].filter((opt) => opt !== undefined) as IDropdownOption<any>[];
  }, [
    legacyManagedIdentityDropdownText,
    oAuthDropdownText,
    servicePrincipalDropdownText,
    supportsLegacyManagedIdentityConnection,
    supportsServicePrincipalConnection,
  ]);

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
        {/* Legacy Multi-Auth */}
        {showLegacyMultiAuth && (
          <div className="param-row">
            <Label className="label" required htmlFor={'legacy-connection-param-set-select'} disabled={isLoading}>
              {legacyMultiAuthLabelText}
            </Label>
            <Dropdown
              id="legacy-connection-param-set-select"
              className="connection-parameter-input"
              selectedKey={selectedParamSetIndex}
              onChange={onAuthDropdownChange}
              disabled={isLoading}
              ariaLabel={legacyMultiAuthLabelText}
              // placeholder={connectionParameterSets?.uiDefinition?.description}
              options={legacyMultiAuthOptions}
            />
          </div>
        )}

        {/* OptionalGateway Checkbox */}
        {!hasOnlyOnPremGateway && Object.entries(getParametersByCapability(Capabilities.gateway)).length > 0 && (
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

        {/* Legacy Managed Identity Selection */}
        {legacyManagedIdentitySelected && (
          <div className="param-row">
            <Label className="label" required htmlFor={'connection-param-set-select'} disabled={isLoading}>
              {legacyManagedIdentityDropdownText}
            </Label>
            <LegacyManagedIdentityDropdown identity={identity} onChange={onLegacyManagedIdentityChange} disabled={isLoading} />
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
                  text: paramSet?.uiDefinition?.displayName ?? paramSet?.name,
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
