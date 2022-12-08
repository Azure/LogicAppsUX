import { filterRecord } from '../utils';
import FunctionAppEntry from './functionAppEntry';
import GatewayPicker from './gatewayPicker';
import type { IDropdownOption } from '@fluentui/react';
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
  ConnectionParameterAllowedValue,
  ConnectionParameterSet,
  ConnectionParameterSetParameter,
  ConnectionParameterSets,
  Gateway,
  Subscription,
} from '@microsoft/utils-logic-apps';
import { ConnectionParameterTypes } from '@microsoft/utils-logic-apps';
import type { FormEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import type { UseQueryResult } from 'react-query';

export interface CreateConnectionProps {
  connectorDisplayName: string;
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

  const singleAuthParams = useMemo(() => connectionParameters ?? {}, [connectionParameters]);
  const multiAuthParams = useMemo(
    () => connectionParameterSets?.values[selectedParamSetIndex].parameters ?? {},
    [connectionParameterSets, selectedParamSetIndex]
  );
  const isMultiAuth = useMemo(() => (connectionParameterSets?.values?.length ?? 0) > 1, [connectionParameterSets?.values]);
  const parameters = useMemo(() => {
    const params = (isMultiAuth ? { ...multiAuthParams } : { ...singleAuthParams }) ?? {};
    return filterRecord<any>(params, (_key, value) => isParamVisible(value));
  }, [isMultiAuth, isParamVisible, multiAuthParams, singleAuthParams]);
  const hasOAuth = useMemo(
    () => checkOAuthCallback(isMultiAuth ? multiAuthParams : singleAuthParams),
    [checkOAuthCallback, isMultiAuth, multiAuthParams, singleAuthParams]
  );

  // Don't show name for simple connections
  const showNameInput = useMemo(() => isMultiAuth || Object.keys(parameters).length > 0, [isMultiAuth, parameters]);

  const [connectionDisplayName, setConnectionDisplayName] = useState<string>('');
  const validParams = useMemo(() => {
    if (showNameInput && !connectionDisplayName) return false;
    if (needsAzureFunction && !selectedFunctionId) return false;
    if (Object.keys(parameters).length === 0) return true;
    return Object.entries(parameters).every(
      ([key, parameter]) => parameter?.uiDefinition?.constraints?.required !== 'true' || !!parameterValues[key]
    );
  }, [connectionDisplayName, needsAzureFunction, parameterValues, parameters, selectedFunctionId, showNameInput]);

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
          Object.entries(parameters)?.map(([key, parameter]: [string, ConnectionParameterSetParameter | ConnectionParameter]) => {
            const data = parameter?.uiDefinition;
            const constraints = parameter?.uiDefinition?.constraints;
            let inputComponent = undefined;

            // Gateway setting parameter
            if (parameter?.type === ConnectionParameterTypes[ConnectionParameterTypes.gatewaySetting]) {
              inputComponent = (
                <GatewayPicker
                  key={key}
                  selectedSubscriptionId={selectedSubscriptionId}
                  selectSubscriptionCallback={selectSubscriptionCallback}
                  availableGateways={availableGateways}
                  availableSubscriptions={availableSubscriptions}
                  isLoading={isLoading}
                  setParameterValues={setParameterValues}
                  parameterValues={parameterValues}
                />
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
          })}

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
