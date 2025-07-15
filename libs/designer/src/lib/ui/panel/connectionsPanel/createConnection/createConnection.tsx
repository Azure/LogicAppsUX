import { needsOAuth } from '../../../../core/actions/bjsworkflow/connections';
import { ActionList } from '../actionList/actionList';
import ConnectionMultiAuthInput from './formInputs/connectionMultiAuth';
import ConnectionNameInput from './formInputs/connectionNameInput';
import LegacyGatewayCheckbox from './formInputs/legacyGatewayCheckbox';
import LegacyManagedIdentityDropdown from './formInputs/legacyManagedIdentityPicker';
import LegacyMultiAuth, { LegacyMultiAuthOptions } from './formInputs/legacyMultiAuth';
import type { ConnectionParameterProps } from './formInputs/universalConnectionParameter';
import { UniversalConnectionParameter } from './formInputs/universalConnectionParameter';
import { css, type IDropdownOption } from '@fluentui/react';
import {
  Body1Strong,
  Button,
  Checkbox,
  type CheckboxOnChangeData,
  Divider,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
} from '@fluentui/react-components';
import {
  ConnectionParameterEditorService,
  ConnectionService,
  Capabilities,
  ConnectionParameterTypes,
  SERVICE_PRINCIPLE_CONSTANTS,
  connectorContainsAllClientCertificateConnectionParameters,
  connectorContainsAllServicePrincipalConnectionParameters,
  filterRecord,
  getPropertyValue,
  isServicePrinicipalConnectionParameter,
  usesLegacyManagedIdentity,
  isUsingAadAuthentication,
  equals,
  isTenantServiceEnabled,
  isEmptyString,
  customLengthGuid,
} from '@microsoft/logic-apps-shared';
import type {
  GatewayServiceConfig,
  IConnectionCredentialMappingEditorProps,
  ConnectionParameter,
  ConnectionParameterSet,
  ConnectionParameterSetParameter,
  ConnectionParameterSets,
  Gateway,
  ManagedIdentity,
  Subscription,
  Connector,
} from '@microsoft/logic-apps-shared';
import type { AzureResourcePickerProps } from '@microsoft/designer-ui';
import { AzureResourcePicker, Label } from '@microsoft/designer-ui';
import fromPairs from 'lodash.frompairs';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { DismissRegular } from '@fluentui/react-icons';
import TenantPicker from './formInputs/tenantPicker';
import { useShouldEnableDynamicConnections } from '../../../../common/hooks/experimentation';
import { useStyles } from './styles';

type ParamType = ConnectionParameter | ConnectionParameterSetParameter;

export interface CreateButtonTexts {
  create?: string;
  creating?: string;
  signIn?: string;
  signingIn?: string;
}

export interface CreateConnectionProps {
  classes?: Record<string, string>;
  nodeIds?: string[];
  iconUri?: string;
  connector: Connector;
  connectionParameterSets?: ConnectionParameterSets;
  description?: string;
  identity?: ManagedIdentity;
  isLoading?: boolean;
  createButtonTexts?: CreateButtonTexts;
  createConnectionCallback?: (
    newName?: string,
    selectedParameterSet?: ConnectionParameterSet,
    parameterValues?: Record<string, any>,
    isOAuthConnection?: boolean,
    alternativeParameterValues?: Record<string, any>,
    identitySelected?: string,
    additionalParameterValues?: Record<string, any>
  ) => void;
  cancelCallback?: () => void;
  hideCancelButton?: boolean;
  showActionBar?: boolean;
  errorMessage?: string;
  clearErrorCallback?: () => void;
  selectSubscriptionCallback?: (subscriptionId: string) => void;
  selectedSubscriptionId?: string;
  availableSubscriptions?: Subscription[];
  availableGateways?: Gateway[];
  gatewayServiceConfig?: Partial<GatewayServiceConfig>;
  checkOAuthCallback: (parameters: Record<string, ConnectionParameter>) => boolean;
  resourceSelectorProps?: AzureResourcePickerProps;
  isAgentServiceConnection?: boolean;
  isAgentSubgraph?: boolean;
}

export const CreateConnection = (props: CreateConnectionProps) => {
  const {
    classes,
    createButtonTexts,
    nodeIds = [],
    showActionBar = true,
    iconUri = '',
    connector,
    connectionParameterSets: _connectionParameterSets,
    description,
    identity,
    isLoading = false,
    createConnectionCallback,
    cancelCallback,
    hideCancelButton = false,
    errorMessage,
    clearErrorCallback,
    selectSubscriptionCallback,
    selectedSubscriptionId,
    availableSubscriptions,
    availableGateways,
    gatewayServiceConfig,
    resourceSelectorProps,
    isAgentServiceConnection,
    isAgentSubgraph,
  } = props;

  const intl = useIntl();
  const styles = useStyles();

  const connectorId = connector?.id;

  const {
    connectionParameters,
    connectionAlternativeParameters,
    capabilities: connectorCapabilities,
    displayName: connectorDisplayName,
  } = connector.properties;

  const [parameterValues, setParameterValues] = useState<Record<string, any>>({});

  const shouldEnableDynamicConnections = useShouldEnableDynamicConnections();
  const [selectedParamSetIndex, setSelectedParamSetIndex] = useState<number>(0);
  const [isUsingDynamicConnection, setIsUsingDynamicConnection] = useState<boolean>(false);
  const onAuthDropdownChange = useCallback(
    (_event: FormEvent<HTMLDivElement>, item: any): void => {
      if (item.key !== selectedParamSetIndex) {
        setSelectedParamSetIndex(item.key as number);
        setParameterValues({}); // Clear out the config params from previous set
      }
    },
    [selectedParamSetIndex]
  );

  const isHiddenAuthKey = useCallback((key: string) => ConnectionService().getAuthSetHideKeys?.()?.includes(key) ?? false, []);
  const isFirstPartyAuth = useMemo(
    () => connector?.properties?.connectionParameters?.['token']?.oAuthSettings?.properties.IsFirstParty,
    [connector]
  );
  const connectionParameterSets: ConnectionParameterSets | undefined = useMemo(() => {
    if (!_connectionParameterSets) {
      return undefined;
    }

    const filteredValues = _connectionParameterSets.values
      .filter((set) => !isHiddenAuthKey(set.name))
      .filter((set) => !isAgentServiceConnection || set.name === 'ManagedServiceIdentity');

    return {
      ..._connectionParameterSets,
      values: filteredValues,
    };
  }, [_connectionParameterSets, isAgentServiceConnection, isHiddenAuthKey]);

  const singleAuthParams = useMemo(
    () => ({
      ...(connectionParameters ?? {}),
      // ...connectionAlternativeParameters ?? {}, // TODO: Riley - This is where we would add in legacy MI params
    }),
    [connectionParameters]
  );
  const multiAuthParams = useMemo(
    () => connectionParameterSets?.values[selectedParamSetIndex]?.parameters ?? {},
    [connectionParameterSets, selectedParamSetIndex]
  );
  const isMultiAuth = useMemo(() => (connectionParameterSets?.values?.length ?? 0) > 0, [connectionParameterSets?.values]);

  const hasOnlyOnPremGateway = useMemo(
    () => (connectorCapabilities?.includes(Capabilities.gateway) && !connectorCapabilities?.includes(Capabilities.cloud)) ?? false,
    [connectorCapabilities]
  );

  const [enabledCapabilities, setEnabledCapabilities] = useState<Capabilities[]>([Capabilities.general, Capabilities.cloud]);
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
    if (hasOnlyOnPremGateway && !enabledCapabilities.includes(Capabilities.gateway)) {
      toggleCapability(Capabilities.gateway);
    }
  }, [enabledCapabilities, hasOnlyOnPremGateway, toggleCapability]);

  const supportsOAuthConnection = useMemo(() => !isHiddenAuthKey('legacyoauth'), [isHiddenAuthKey]);

  const supportsLegacyServicePrincipalConnection = useMemo(
    () =>
      !isMultiAuth &&
      connectorContainsAllServicePrincipalConnectionParameters(singleAuthParams) &&
      !isHiddenAuthKey('legacyserviceprincipal'),
    [isHiddenAuthKey, isMultiAuth, singleAuthParams]
  );

  const multiAuthSupportsServicePrincipalConnection = useMemo(
    () => isMultiAuth && connectorContainsAllServicePrincipalConnectionParameters(multiAuthParams),
    [isMultiAuth, multiAuthParams]
  );

  const supportsServicePrincipalConnection = useMemo(
    () => multiAuthSupportsServicePrincipalConnection || supportsLegacyServicePrincipalConnection,
    [multiAuthSupportsServicePrincipalConnection, supportsLegacyServicePrincipalConnection]
  );

  const supportsClientCertificateConnection = useMemo(
    () => isMultiAuth && connectorContainsAllClientCertificateConnectionParameters(multiAuthParams),
    [isMultiAuth, multiAuthParams]
  );

  const supportsLegacyManagedIdentityConnection = useMemo(
    () => usesLegacyManagedIdentity(connectionAlternativeParameters) && !isHiddenAuthKey('legacymanagedidentity'),
    [connectionAlternativeParameters, isHiddenAuthKey]
  );

  const showLegacyMultiAuth = useMemo(
    () => !isMultiAuth && (supportsLegacyServicePrincipalConnection || supportsLegacyManagedIdentityConnection),
    [isMultiAuth, supportsLegacyServicePrincipalConnection, supportsLegacyManagedIdentityConnection]
  );

  const legacyMultiAuthServicePrincipalSelected = useMemo(
    () => showLegacyMultiAuth && selectedParamSetIndex === LegacyMultiAuthOptions.servicePrincipal,
    [selectedParamSetIndex, showLegacyMultiAuth]
  );

  const servicePrincipalSelected = useMemo(
    () => legacyMultiAuthServicePrincipalSelected || multiAuthSupportsServicePrincipalConnection,
    [legacyMultiAuthServicePrincipalSelected, multiAuthSupportsServicePrincipalConnection]
  );

  const legacyManagedIdentitySelected = useMemo(
    () => showLegacyMultiAuth && selectedParamSetIndex === LegacyMultiAuthOptions.managedIdentity,
    [selectedParamSetIndex, showLegacyMultiAuth]
  );

  const [selectedManagedIdentity, setSelectedManagedIdentity] = useState<string | undefined>(undefined);

  const onLegacyManagedIdentityChange = useCallback((_: any, option?: IDropdownOption<any>) => {
    setSelectedManagedIdentity(option?.key.toString());
  }, []);

  const usingLegacyGatewayAuth = useMemo(
    () => !hasOnlyOnPremGateway && enabledCapabilities.includes(Capabilities.gateway),
    [enabledCapabilities, hasOnlyOnPremGateway]
  );

  const hasOAuth = useMemo(
    () => needsOAuth(isMultiAuth ? multiAuthParams : singleAuthParams) && !usingLegacyGatewayAuth,
    [isMultiAuth, multiAuthParams, singleAuthParams, usingLegacyGatewayAuth]
  );

  const isUsingOAuth = useMemo(
    () => hasOAuth && !servicePrincipalSelected && !legacyManagedIdentitySelected && !supportsClientCertificateConnection,
    [hasOAuth, servicePrincipalSelected, legacyManagedIdentitySelected, supportsClientCertificateConnection]
  );

  const usingAadConnection = useMemo(() => (connector ? isUsingAadAuthentication(connector) : false), [connector]);

  const showTenantIdSelection = useMemo(
    () =>
      isTenantServiceEnabled() &&
      usingAadConnection &&
      isUsingOAuth &&
      Object.keys(connectionParameters?.['token']?.oAuthSettings?.customParameters ?? {}).some((key: string) => equals(key, 'tenantId')) &&
      Object.keys(connectionParameters ?? {}).some((key: string) =>
        equals(key, SERVICE_PRINCIPLE_CONSTANTS.CONFIG_ITEM_KEYS.TOKEN_TENANT_ID)
      ),
    [connectionParameters, isUsingOAuth, usingAadConnection]
  );

  const isParamVisible = useCallback(
    (key: string, parameter: ParamType) => {
      const constraints = parameter?.uiDefinition?.constraints;
      if (servicePrincipalSelected) {
        return isServicePrinicipalConnectionParameter(key) && isServicePrincipalParameterVisible(key, parameter);
      }
      if (legacyManagedIdentitySelected) {
        return false; // TODO: Riley - Only show the managed identity parameters (which is none for now)
      }
      if (constraints?.hidden === 'true' || constraints?.hideInUI === 'true') {
        return false;
      }
      const dependentParam = constraints?.dependentParameter;
      if (dependentParam?.parameter && getPropertyValue(parameterValues, dependentParam.parameter) !== dependentParam.value) {
        return false;
      }
      if (parameter.type === ConnectionParameterTypes.oauthSetting) {
        return false;
      }
      if (parameter.type === ConnectionParameterTypes.managedIdentity) {
        return false;
      }
      if (equals(key, SERVICE_PRINCIPLE_CONSTANTS.CONFIG_ITEM_KEYS.TOKEN_TENANT_ID) && showTenantIdSelection) {
        return false;
      }
      return true;
    },
    [servicePrincipalSelected, legacyManagedIdentitySelected, parameterValues, showTenantIdSelection]
  );

  const unfilteredParameters: Record<string, ConnectionParameterSetParameter | ConnectionParameter> = useMemo(
    () => (isMultiAuth ? { ...multiAuthParams } : { ...singleAuthParams }),
    [isMultiAuth, multiAuthParams, singleAuthParams]
  );

  const parameters: Record<string, ConnectionParameterSetParameter | ConnectionParameter> = useMemo(
    () => filterRecord<any>(unfilteredParameters, (key, value) => isParamVisible(key, value)),
    [isParamVisible, unfilteredParameters]
  );

  // Parameters record, under a layer of singular capability, if it has none or more than one it's under "general"
  const parametersByCapability = useMemo(() => {
    const output: {
      [_: string]: {
        [_: string]: ConnectionParameter | ConnectionParameterSetParameter;
      };
    } = {};
    Object.entries(parameters ?? {}).forEach(([key, parameter]) => {
      const capability =
        (parameter.uiDefinition?.constraints?.capability?.length ?? 0) === 1
          ? (parameter.uiDefinition?.constraints?.capability?.[0] ?? 'general')
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
      if (enabledCapabilities.map((c) => Capabilities[c]).includes(capabilityText as any)) {
        output = {
          ...output,
          ...parameters,
        };
      }
    });
    return output ?? {};
  }, [enabledCapabilities, parametersByCapability]);

  // Don't show name for simple connections
  const showNameInput = useMemo(
    () =>
      !(isUsingOAuth && !isMultiAuth) &&
      (isMultiAuth || Object.keys(capabilityEnabledParameters ?? {}).length > 0 || legacyManagedIdentitySelected),
    [isUsingOAuth, isMultiAuth, capabilityEnabledParameters, legacyManagedIdentitySelected]
  );

  const [connectionDisplayName, setConnectionDisplayName] = useState<string>(`new_conn_${customLengthGuid(5)}`.toLowerCase());
  const validParams = useMemo(() => {
    if (showNameInput && !connectionDisplayName) {
      return false;
    }
    if (
      resourceSelectorProps &&
      ((resourceSelectorProps?.fetchSubResourcesCallback && !resourceSelectorProps?.selectedSubResource) ||
        !resourceSelectorProps?.selectedResourceId)
    ) {
      return false;
    }
    if (legacyManagedIdentitySelected && !selectedManagedIdentity) {
      return false;
    }
    if (Object.keys(capabilityEnabledParameters ?? {}).length === 0) {
      return true;
    }
    return Object.entries(capabilityEnabledParameters).every(
      ([key, parameter]) => parameter?.uiDefinition?.constraints?.required !== 'true' || !!parameterValues[key]
    );
  }, [
    showNameInput,
    connectionDisplayName,
    resourceSelectorProps,
    legacyManagedIdentitySelected,
    selectedManagedIdentity,
    capabilityEnabledParameters,
    parameterValues,
  ]);

  const canSubmit = useMemo(() => !isLoading && validParams, [isLoading, validParams]);

  const submitCallback = useCallback(() => {
    const { visibleParameterValues, additionalParameterValues } = parseParameterValues(
      parameterValues,
      capabilityEnabledParameters,
      isUsingDynamicConnection
    );

    // The OAuth tenant ID is passed a little strange, we need to manually add it here
    const oauthTenantId = additionalParameterValues?.[SERVICE_PRINCIPLE_CONSTANTS.CONFIG_ITEM_KEYS.TOKEN_TENANT_ID];
    if (showTenantIdSelection && oauthTenantId) {
      visibleParameterValues[SERVICE_PRINCIPLE_CONSTANTS.CONFIG_ITEM_KEYS.TOKEN_TENANT_ID] = oauthTenantId;
    }

    // This value needs to be passed conditionally but the parameter is hidden, so we're manually inputting it here
    if (
      supportsLegacyServicePrincipalConnection &&
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
      identitySelected,
      additionalParameterValues
    );
  }, [
    parameterValues,
    supportsLegacyServicePrincipalConnection,
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
    showTenantIdSelection,
    isUsingDynamicConnection,
  ]);

  // INTL STRINGS

  const componentDescription = intl.formatMessage({
    defaultMessage: 'Create a new connection',
    id: '74e2xB',
    description: 'General description for creating a new connection.',
  });

  const createButtonText = intl.formatMessage({
    defaultMessage: 'Create new',
    id: 'JKfEGS',
    description: 'Button to add a new connection',
  });

  const createButtonLoadingText = intl.formatMessage({
    defaultMessage: 'Creating...',
    id: 'LMB8am',
    description: 'Button text to show a connection is being created',
  });

  const createButtonAria = intl.formatMessage({
    defaultMessage: 'Create a new connection',
    id: 'TX4Kdr',
    description: 'aria label description for create button',
  });

  const cancelButtonText = intl.formatMessage({
    defaultMessage: 'Cancel',
    id: '9EmN2M',
    description: 'Button to cancel creating a connection',
  });

  const cancelButtonAria = intl.formatMessage({
    defaultMessage: 'Cancel creating a connection',
    id: 'sFwHQc',
    description: 'aria label description for cancel button',
  });

  const simpleDescriptionText = intl.formatMessage(
    {
      defaultMessage: 'Create a connection for {connectorName}.',
      id: 'vr70Gn',
      description: 'Create a connection for selected connector',
    },
    {
      connectorName: connectorDisplayName,
    }
  );

  const authDescriptionText = intl.formatMessage(
    {
      defaultMessage: 'Sign in to create a connection to {connectorDisplayName}.',
      id: 'EiRMD4',
      description: 'Description for creating an externally authenticated connection.',
    },
    { connectorDisplayName }
  );

  const signInButtonText = intl.formatMessage({
    defaultMessage: 'Sign in',
    id: 'y1e9yw',
    description: 'Text for sign in button.',
  });

  const signInButtonAria = intl.formatMessage({
    defaultMessage: 'Sign in to connector',
    id: 'mca3Ml',
    description: 'Aria label description for sign in button.',
  });

  const signInButtonLoadingText = intl.formatMessage({
    defaultMessage: 'Signing in...',
    id: 'E+HsWF',
    description: 'Text for sign in button while loading.',
  });

  const closeErrorButtonAriaLabel = intl.formatMessage({
    defaultMessage: 'Close',
    id: '9IDWMU',
    description: 'Close button aria label',
  });

  const legacyManagedIdentityLabelText = intl.formatMessage({
    defaultMessage: 'Managed identity',
    id: 'uIgGKj',
    description: 'Dropdown text for legacy managed identity connection',
  });

  const stringResources = useMemo(
    () => ({
      USE_DYNAMIC_CONNECTIONS: intl.formatMessage({
        defaultMessage: 'Use as Dynamic Connection',
        id: 'sWJGpe',
        description: 'Dynamic connection checkbox text',
      }),
    }),
    [intl]
  );

  const connectorDescription = useMemo(() => {
    if (isUsingOAuth) {
      return authDescriptionText;
    }
    if (Object.keys(parameters ?? {}).length === 0) {
      return simpleDescriptionText;
    }
    return '';
  }, [authDescriptionText, isUsingOAuth, parameters, simpleDescriptionText]);

  const submitButtonText = useMemo(() => {
    if (isLoading) {
      return isUsingOAuth
        ? (createButtonTexts?.signingIn ?? signInButtonLoadingText)
        : (createButtonTexts?.creating ?? createButtonLoadingText);
    }
    return isUsingOAuth ? (createButtonTexts?.signIn ?? signInButtonText) : (createButtonTexts?.create ?? createButtonText);
  }, [
    createButtonLoadingText,
    createButtonText,
    createButtonTexts?.create,
    createButtonTexts?.creating,
    createButtonTexts?.signIn,
    createButtonTexts?.signingIn,
    isLoading,
    isUsingOAuth,
    signInButtonLoadingText,
    signInButtonText,
  ]);

  const submitButtonAriaLabel = useMemo(() => {
    return isUsingOAuth ? signInButtonAria : createButtonAria;
  }, [isUsingOAuth, signInButtonAria, createButtonAria]);

  // TODO -This check should be removed because backend has to fix their connection parameters if it should not be shown in UI.
  const showConfigParameters = useMemo(
    () => !resourceSelectorProps || (resourceSelectorProps && isMultiAuth),
    [resourceSelectorProps, isMultiAuth]
  );

  const renderConnectionParameter = (key: string, parameter: ConnectionParameterSetParameter | ConnectionParameter) => {
    const connectionParameterProps: ConnectionParameterProps = {
      parameterKey: key,
      parameter,
      value: parameterValues[key],
      setValue: (val: any) => setParameterValues((values) => ({ ...values, [key]: val })),
      isSubscriptionDropdownDisabled: gatewayServiceConfig?.disableSubscriptionLookup,
      isLoading,
      selectedSubscriptionId,
      selectSubscriptionCallback,
      availableGateways,
      availableSubscriptions,
      identity,
      parameterSet: connectionParameterSets?.values[selectedParamSetIndex],
      setKeyValue: (customKey: string, val: any) => setParameterValues((values) => ({ ...values, [customKey]: val })),
      isAgentServiceConnection: isAgentServiceConnection,
    };

    const customParameterOptions = ConnectionParameterEditorService()?.getConnectionParameterEditor({
      connectorId,
      parameterKey: key,
    });
    if (customParameterOptions) {
      const CustomConnectionParameter = customParameterOptions.EditorComponent;
      return <CustomConnectionParameter key={key} data-testId={key} {...connectionParameterProps} />;
    }

    return <UniversalConnectionParameter key={key} data-testId={key} {...connectionParameterProps} />;
  };

  // Connection parameters mapping allows grouping several parameters into one custom editor.
  // Keep track of encountered and active mappings to avoid rendering the same mapping multiple times, or rendering the included parameters.
  const allParameterMappings = new Set<string>();
  const activeParameterMappings = new Set<string>();
  const renderCredentialsMappingParameter = (
    parameterKey: string,
    parameter: ConnectionParameterSetParameter | ConnectionParameter,
    mappingName: string
  ) => {
    if (!allParameterMappings.has(mappingName)) {
      allParameterMappings.add(mappingName);
      // This is the first time this mapping has been encountered,
      // we need to check if there is an Editor for it - overriding each included parameters.
      const parameters = fromPairs(
        Object.entries(capabilityEnabledParameters).filter(
          ([_, parameter]) => parameter.uiDefinition?.credentialMapping?.mappingName === mappingName
        )
      );

      const credentialMappingOptions = ConnectionParameterEditorService()?.getCredentialMappingEditorOptions?.({
        connectorId,
        mappingName,
        parameters,
      });

      if (credentialMappingOptions) {
        activeParameterMappings.add(mappingName);
        const CredentialsMappingEditorComponent = credentialMappingOptions.EditorComponent;
        const props: IConnectionCredentialMappingEditorProps = {
          connectorId,
          mappingName,
          parameters,
          setParameterValues,
          renderParameter: renderConnectionParameter,
          isLoading,
        };
        return <CredentialsMappingEditorComponent key={`mapping:${mappingName}`} {...props} />;
      }
    }

    // If we encounter an already active mapping,
    // we skip the parameter rendering since an Editor was already found and rendered.
    if (activeParameterMappings.has(mappingName)) {
      return null;
    }

    // Default case: render the parameter. No custom Editor was found for this mapping.
    return renderConnectionParameter(parameterKey, parameter);
  };

  // RENDER

  return (
    <div className={classes?.['root'] ? css('msla-edit-connection-container', classes?.['root']) : 'msla-edit-connection-container'}>
      {showActionBar ? <ActionList nodeIds={nodeIds} iconUri={iconUri} /> : null}
      {showActionBar ? <Divider /> : null}

      <Body1Strong>{description ?? componentDescription}</Body1Strong>

      <div
        className={
          classes?.['content'] ? css('msla-create-connection-container', classes?.['content']) : 'msla-create-connection-container'
        }
      >
        {/* Error Bar */}
        {errorMessage && (
          <MessageBar intent={'error'} style={{ width: '100%', whiteSpace: 'normal' }}>
            <MessageBarBody>{errorMessage}</MessageBarBody>
            <MessageBarActions
              containerAction={
                <Button
                  aria-label={closeErrorButtonAriaLabel}
                  appearance="transparent"
                  icon={<DismissRegular />}
                  onClick={clearErrorCallback}
                />
              }
            />
          </MessageBar>
        )}

        {/* Parameters */}
        <div className="connection-params-container">
          {/* Legacy Multi-Auth */}
          {showLegacyMultiAuth && (
            <LegacyMultiAuth
              data-testId={'legacy-multi-auth'}
              isLoading={isLoading}
              value={selectedParamSetIndex}
              onChange={onAuthDropdownChange}
              supportsOAuthConnection={supportsOAuthConnection}
              supportsServicePrincipalConnection={supportsServicePrincipalConnection}
              supportsLegacyManagedIdentityConnection={supportsLegacyManagedIdentityConnection}
            />
          )}

          {/* OptionalGateway Checkbox */}
          {!hasOnlyOnPremGateway && Object.entries(getParametersByCapability(Capabilities.gateway)).length > 0 && (
            <LegacyGatewayCheckbox
              data-testId={'legacy-gateway-checkbox'}
              isLoading={isLoading}
              value={enabledCapabilities.includes(Capabilities.gateway)}
              onChange={() => toggleCapability(Capabilities.gateway)}
            />
          )}

          {/* Name */}
          {showNameInput && (
            <ConnectionNameInput
              data-testId={'connection-name-input'}
              isLoading={isLoading}
              value={connectionDisplayName}
              onChange={(e: any, val?: string) => setConnectionDisplayName(val ?? '')}
            />
          )}

          {/* Legacy Managed Identity Selection */}
          {legacyManagedIdentitySelected && (
            <div className="param-row">
              <Label
                className="label"
                isRequiredField={true}
                text={legacyManagedIdentityLabelText}
                htmlFor={'connection-param-set-select'}
                disabled={isLoading}
              />
              <LegacyManagedIdentityDropdown identity={identity} onChange={onLegacyManagedIdentityChange} disabled={isLoading} />
            </div>
          )}

          {/* Authentication Selection */}
          {isMultiAuth && (
            <ConnectionMultiAuthInput
              data-testId={'connection-multi-auth-input'}
              isLoading={isLoading}
              value={selectedParamSetIndex}
              onChange={onAuthDropdownChange}
              connectionParameterSets={connectionParameterSets}
            />
          )}

          {/* OAuth tenant ID selection */}
          {showTenantIdSelection && (
            <TenantPicker
              data-testId={'connection-param-oauth-tenants'}
              isLoading={isLoading}
              value={parameterValues[SERVICE_PRINCIPLE_CONSTANTS.CONFIG_ITEM_KEYS.TOKEN_TENANT_ID]}
              setValue={(val: string) =>
                setParameterValues({
                  ...parameterValues,
                  [SERVICE_PRINCIPLE_CONSTANTS.CONFIG_ITEM_KEYS.TOKEN_TENANT_ID]: val,
                })
              }
            />
          )}

          {/* Connector Parameters */}
          {showConfigParameters &&
            Object.entries(capabilityEnabledParameters)?.map(
              ([key, parameter]: [string, ConnectionParameterSetParameter | ConnectionParameter]) => {
                const mappingName = parameter?.uiDefinition?.credentialMapping?.mappingName;
                if (mappingName) {
                  // This parameter belongs to a mapping - try to render a custom editor if supported.
                  return renderCredentialsMappingParameter(key, parameter, mappingName);
                }
                return renderConnectionParameter(key, parameter);
              }
            )}

          {/* Resource Selector UI */}
          {resourceSelectorProps && <AzureResourcePicker {...resourceSelectorProps} />}
        </div>

        {/* Descriptor text for simple and oauth */}
        {!isEmptyString(connectorDescription) && (
          <div data-automation-id={'connector-connection-creation-description'}>{connectorDescription}</div>
        )}
        {/* {needsAuth && <IFrameTermsOfService url={termsOfServiceUrl} />} */}
      </div>

      <div className={styles.dynamicConnectionContainer}>
        {isUsingOAuth && isAgentSubgraph && shouldEnableDynamicConnections && isFirstPartyAuth && (
          <Checkbox
            label={stringResources.USE_DYNAMIC_CONNECTIONS}
            disabled={isLoading}
            onChange={(_e, data: CheckboxOnChangeData) => {
              setIsUsingDynamicConnection(!!data.checked);
            }}
            defaultChecked={false}
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className="msla-edit-connection-actions-container">
        <Button
          appearance="primary"
          disabled={!canSubmit}
          aria-label={submitButtonAriaLabel}
          onClick={submitCallback}
          data-automation-id="create-connection-button"
        >
          {submitButtonText}
        </Button>
        {hideCancelButton ? null : (
          <Button
            disabled={isLoading}
            aria-label={cancelButtonAria}
            onClick={cancelCallback}
            data-automation-id="cancel-create-connection-button"
          >
            {cancelButtonText}
          </Button>
        )}
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
  ) {
    return true;
  }
  const constraints = parameter?.uiDefinition?.constraints;
  if (constraints?.hidden === 'true' || constraints?.hideInUI === 'true') {
    return false;
  }
  return true;
};

export function parseParameterValues(
  parameterValues: Record<string, any>,
  capabilityEnabledParameters: Record<string, ConnectionParameter | ConnectionParameterSetParameter>,
  isUsingDynamicConnection?: boolean
) {
  const visibleParameterValues = Object.fromEntries(
    Object.entries(parameterValues).filter(([key]) => Object.keys(capabilityEnabledParameters).includes(key)) ?? []
  );
  const additionalParameterValues = Object.fromEntries(
    Object.entries(parameterValues).filter(([key]) => !Object.keys(capabilityEnabledParameters).includes(key)) ?? []
  );

  if (isUsingDynamicConnection) {
    // If using dynamic connections, we need to remove the connection name from the additional parameters
    additionalParameterValues['isDynamicConnectionAllowed'] = true;
  }

  return {
    visibleParameterValues,
    additionalParameterValues: Object.keys(additionalParameterValues).length ? additionalParameterValues : undefined,
  };
}
