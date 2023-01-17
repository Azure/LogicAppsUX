import { filterRecord } from '../utils';
import FunctionAppEntry from './functionAppEntry';
import { UniversalConnectionParameter } from './universalConnectionParameter';
import {
  Text,
  List,
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
  Spinner,
} from '@fluentui/react';
import type {
  ConnectionParameter,
  ConnectionParameterSet,
  ConnectionParameterSetParameter,
  ConnectionParameterSets,
  Gateway,
  Subscription,
} from '@microsoft/utils-logic-apps';
import { Capabilities, ConnectionParameterTypes } from '@microsoft/utils-logic-apps';
import type { FormEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import type { UseQueryResult } from 'react-query';

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
  needsAzureFunction: boolean;
  functionAppsQuery: UseQueryResult;
  selectedAppId: string;
  selectedFunctionId: string;
  selectAppCallback: (appId: string) => void;
  fetchFunctionsCallback: (functionAppId: string) => Promise<any[]>;
  selectFunctionCallback: (appFunction: any) => void;
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
    needsAzureFunction,
    functionAppsQuery,
    selectedAppId,
    selectedFunctionId,
    selectAppCallback,
    fetchFunctionsCallback,
    selectFunctionCallback,
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

  const isParamVisible = useCallback(
    (parameter: ParamType) => {
      const constraints = parameter?.uiDefinition?.constraints;
      if (constraints?.hidden === 'true' || constraints?.hideInUI === 'true') return false;
      const dependencyParam = constraints?.dependentParameter;
      if (dependencyParam && parameterValues[dependencyParam.parameter] !== dependencyParam.value) return false;
      if (parameter.type === ConnectionParameterTypes[ConnectionParameterTypes.oauthSetting]) return false;
      return true;
    },
    [parameterValues]
  );

  const unfilteredParameters: Record<string, ConnectionParameterSetParameter | ConnectionParameter> = useMemo(
    () => (isMultiAuth ? { ...multiAuthParams } : { ...singleAuthParams }) ?? {},
    [isMultiAuth, multiAuthParams, singleAuthParams]
  );

  const parameters: Record<string, ConnectionParameterSetParameter | ConnectionParameter> = useMemo(
    () => filterRecord<any>(unfilteredParameters, (_, value) => isParamVisible(value)),
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
    return output;
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

  const [connectionDisplayName, setConnectionDisplayName] = useState<string>('');
  const validParams = useMemo(() => {
    if (showNameInput && !connectionDisplayName) return false;
    if (needsAzureFunction && !selectedFunctionId) return false;
    if (Object.keys(capabilityEnabledParameters ?? {}).length === 0) return true;
    return Object.entries(capabilityEnabledParameters).every(
      ([key, parameter]) => parameter?.uiDefinition?.constraints?.required !== 'true' || !!parameterValues[key]
    );
  }, [connectionDisplayName, needsAzureFunction, parameterValues, capabilityEnabledParameters, selectedFunctionId, showNameInput]);

  const canSubmit = useMemo(() => !isLoading && validParams, [isLoading, validParams]);

  const submitCallback = useCallback(() => {
    return createConnectionCallback?.(
      connectionDisplayName,
      connectionParameterSets?.values[selectedParamSetIndex],
      parameterValues,
      hasOAuth
    );
  }, [createConnectionCallback, connectionDisplayName, connectionParameterSets?.values, selectedParamSetIndex, parameterValues, hasOAuth]);

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

  const functionAppsLoadingText = intl.formatMessage({
    defaultMessage: 'Loading Function Apps...',
    description: 'Text for loading function apps',
  });

  const functionAppsLabel = intl.formatMessage({
    defaultMessage: 'Select a function app function',
    description: 'Label for function app selection',
  });

  const gatewayTooltipText = intl.formatMessage({
    defaultMessage: 'Select this if you are configuring an on-prem connection',
    description: 'Tooltip for on-prem gateway connection checkbox',
  });

  const connectorDescription = useMemo(() => {
    if (hasOAuth) return authDescriptionText;
    if (Object.keys(parameters ?? {}).length === 0) return simpleDescriptionText;
    return '';
  }, [authDescriptionText, hasOAuth, parameters, simpleDescriptionText]);

  const submitButtonText = useMemo(() => {
    if (isLoading) return hasOAuth ? signInButtonLoadingText : createButtonLoadingText;
    return hasOAuth ? signInButtonText : createButtonText;
  }, [createButtonLoadingText, createButtonText, isLoading, hasOAuth, signInButtonLoadingText, signInButtonText]);

  const submitButtonAriaLabel = useMemo(() => {
    return hasOAuth ? signInButtonAria : createButtonAria;
  }, [hasOAuth, signInButtonAria, createButtonAria]);

  const functionApps = useMemo(
    () => ((functionAppsQuery?.data ?? []) as any[]).sort((a, b) => a.name.localeCompare(b.name)),
    [functionAppsQuery.data]
  );

  const showConfigParameters = useMemo(() => !needsAzureFunction, [needsAzureFunction]);

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

        {/* Function Apps */}
        {needsAzureFunction && (
          <div>
            <Label className="label" required>
              {functionAppsLabel}
            </Label>
            <div className="msla-function-apps-container">
              <div className="msla-function-app-list-header">
                <Text>{'Name'}</Text>
                <Text>{'Resource Group'}</Text>
                <Text>{'Location'}</Text>
              </div>
              {functionAppsQuery?.isLoading ? (
                <Spinner label={functionAppsLoadingText} style={{ margin: '16px' }} />
              ) : functionAppsQuery?.isSuccess ? (
                <div className="msla-function-apps-list-container" data-is-scrollable>
                  <List
                    items={functionApps.map((fApp) => ({
                      ...fApp,
                      selected: selectedAppId === fApp.id,
                      selectedFunctionId,
                    }))}
                    onRenderCell={(fApp) => (
                      <FunctionAppEntry
                        isLoading={isLoading}
                        functionApp={fApp}
                        onAppSelect={selectAppCallback}
                        onFunctionSelect={selectFunctionCallback}
                        fetchFunctions={fetchFunctionsCallback}
                      />
                    )}
                  />
                </div>
              ) : functionAppsQuery?.isError ? (
                <MessageBar messageBarType={MessageBarType.error} style={{ margin: '16px' }}>
                  {functionAppsQuery?.error as string}
                </MessageBar>
              ) : null}
            </div>
          </div>
        )}
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
