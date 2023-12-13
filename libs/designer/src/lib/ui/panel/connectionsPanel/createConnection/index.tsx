import constants from '../../../../common/constants';
import type { AppDispatch, RootState } from '../../../../core';
import { getIconUriFromConnector, useOperationInfo, useSelectedNodeId, useSelectedNodeIds } from '../../../../core';
import type { ConnectionPayload } from '../../../../core/actions/bjsworkflow/connections';
import {
  getConnectionMetadata,
  getConnectionProperties,
  getApiHubAuthentication,
  updateNodeConnection,
  needsOAuth,
} from '../../../../core/actions/bjsworkflow/connections';
import {
  useConnectorByNodeId,
  useGatewayServiceConfig,
  useGateways,
  useSubscriptions,
} from '../../../../core/state/connection/connectionSelector';
import { useReferencePanelMode } from '../../../../core/state/panel/panelSelectors';
import { setIsCreatingConnection, openPanel } from '../../../../core/state/panel/panelSlice';
import { useOperationManifest } from '../../../../core/state/selectors/actionMetadataSelector';
import { getAssistedConnectionProps, getSupportedParameterSets } from '../../../../core/utils/connectors/connections';
import { ActionList } from '../actionList/actionList';
import ConnectionMultiAuthInput from './formInputs/connectionMultiAuth';
import ConnectionNameInput from './formInputs/connectionNameInput';
import LegacyGatewayCheckbox from './formInputs/legacyGatewayCheckbox';
import LegacyManagedIdentityDropdown from './formInputs/legacyManagedIdentityPicker';
import LegacyMultiAuth, { LegacyMultiAuthOptions } from './formInputs/legacyMultiAuth';
import type { ConnectionParameterProps } from './formInputs/universalConnectionParameter';
import { UniversalConnectionParameter } from './formInputs/universalConnectionParameter';
import { createConnection } from './helpers/createConnection';
import type { IDropdownOption } from '@fluentui/react';
import { MessageBarType, MessageBar, Label } from '@fluentui/react';
import { Body1Strong, Button, Divider, Spinner } from '@fluentui/react-components';
import {
  ConnectionParameterEditorService,
  LogEntryLevel,
  LoggerService,
  WorkflowService,
} from '@microsoft/designer-client-services-logic-apps';
import type { IConnectionCredentialMappingEditorProps } from '@microsoft/designer-client-services-logic-apps';
import { AzureResourcePicker } from '@microsoft/designer-ui';
import type {
  Connection,
  ConnectionParameter,
  ConnectionParameterSetParameter,
  Connector,
  ManagedIdentity,
} from '@microsoft/utils-logic-apps';
import {
  Capabilities,
  ConnectionParameterTypes,
  SERVICE_PRINCIPLE_CONSTANTS,
  connectorContainsAllServicePrinicipalConnectionParameters,
  filterRecord,
  getPropertyValue,
  isServicePrinicipalConnectionParameter,
  usesLegacyManagedIdentity,
} from '@microsoft/utils-logic-apps';
import fromPairs from 'lodash.frompairs';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

type ParamType = ConnectionParameter | ConnectionParameterSetParameter;

export const CreateConnection = () => {
  const dispatch = useDispatch<AppDispatch>();

  const intl = useIntl();
  const nodeIds = useSelectedNodeIds();
  const nodeId = useSelectedNodeId();
  const connector = useConnectorByNodeId(nodeId);
  const iconUri = getIconUriFromConnector(connector);
  const operationInfo = useOperationInfo(nodeId);
  const { data: operationManifest } = useOperationManifest(operationInfo);
  const connectionMetadata = getConnectionMetadata(operationManifest);
  const hasExistingConnection = useSelector((state: RootState) => !!state.connections.connectionsMapping[nodeId]);

  const subscriptionsQuery = useSubscriptions();
  const subscriptions = useMemo(() => subscriptionsQuery.data, [subscriptionsQuery.data]);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState('');
  const gatewaysQuery = useGateways(selectedSubscriptionId, connector?.id ?? '');
  const availableGateways = useMemo(() => gatewaysQuery.data, [gatewaysQuery]);
  const gatewayServiceConfig = useGatewayServiceConfig();

  const identity = WorkflowService().getAppIdentity?.() as ManagedIdentity;

  const [isLoading, setIsLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const applyNewConnection = useCallback(
    (nodeId: string, newConnection: Connection, selectedIdentity?: string) => {
      const payload: ConnectionPayload = { nodeId, connection: newConnection, connector: connector as Connector };

      if (selectedIdentity) {
        const userAssignedIdentity = selectedIdentity !== constants.SYSTEM_ASSIGNED_MANAGED_IDENTITY ? selectedIdentity : undefined;
        payload.connectionProperties = getConnectionProperties(connector as Connector, userAssignedIdentity);
        payload.authentication = getApiHubAuthentication(userAssignedIdentity);
      }

      dispatch(updateNodeConnection(payload));
    },
    [connector, dispatch]
  );

  const assistedConnectionProps = useMemo(
    () => (connector ? getAssistedConnectionProps(connector, operationManifest) : undefined),
    [connector, operationManifest]
  );

  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [selectedSubResource, setSelectedSubResource] = useState<any | undefined>();

  const selectResourceCallback = useCallback((resource: any) => {
    setSelectedResourceId(resource?.id);
    setSelectedSubResource(undefined);
  }, []);

  const selectSubResourceCallback = useCallback((subResource: any) => {
    setSelectedSubResource(subResource);
  }, []);

  const resourceSelectorProps = useMemo(
    () =>
      assistedConnectionProps
        ? {
            ...assistedConnectionProps,
            selectedResourceId,
            onResourceSelect: selectResourceCallback,
            selectedSubResource,
            onSubResourceSelect: selectSubResourceCallback,
          }
        : undefined,
    [assistedConnectionProps, selectResourceCallback, selectSubResourceCallback, selectedResourceId, selectedSubResource]
  );

  const referencePanelMode = useReferencePanelMode();
  const closeConnectionsFlow = useCallback(() => {
    const panelMode = referencePanelMode ?? 'Operation';
    const nodeId = panelMode === 'Operation' ? nodeIds?.[0] : undefined;
    dispatch(openPanel({ nodeId, panelMode }));
  }, [dispatch, referencePanelMode, nodeIds]);

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading connection data...',
    description: 'Message to show under the loading icon when loading connection parameters',
  });

  const connectorId = connector?.id ?? '';
  const connectorDisplayName = connector?.properties.displayName;
  const connectorCapabilities = connector?.properties.capabilities;
  const connectionParameters = connector?.properties.connectionParameters;
  const connectionParameterSets = getSupportedParameterSets(connector?.properties.connectionParameterSets, operationInfo.type);
  const connectionAlternativeParameters = connector?.properties?.connectionAlternativeParameters;

  const hideCancelButton = !hasExistingConnection;

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
      const dependentParam = constraints?.dependentParameter;
      if (dependentParam?.parameter && getPropertyValue(parameterValues, dependentParam.parameter) !== dependentParam.value) return false;
      if (parameter.type === ConnectionParameterTypes.oauthSetting) return false;
      if (parameter.type === ConnectionParameterTypes.managedIdentity) return false;
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
      if (enabledCapabilities.map((c) => Capabilities[c]).includes(capabilityText as any))
        output = {
          ...output,
          ...parameters,
        };
    });
    return output ?? {};
  }, [enabledCapabilities, parametersByCapability]);

  const usingLegacyGatewayAuth = useMemo(
    () => !hasOnlyOnPremGateway && enabledCapabilities.includes(Capabilities.gateway),
    [enabledCapabilities, hasOnlyOnPremGateway]
  );

  const hasOAuth = useMemo(
    () => needsOAuth(isMultiAuth ? multiAuthParams : singleAuthParams) && !usingLegacyGatewayAuth,
    [isMultiAuth, multiAuthParams, singleAuthParams, usingLegacyGatewayAuth]
  );

  const isUsingOAuth = useMemo(
    () => hasOAuth && !servicePrincipalSelected && !legacyManagedIdentitySelected,
    [hasOAuth, servicePrincipalSelected, legacyManagedIdentitySelected]
  );

  // Don't show name for simple connections
  const showNameInput = useMemo(
    () =>
      !(isUsingOAuth && !isMultiAuth) &&
      (isMultiAuth || Object.keys(capabilityEnabledParameters ?? {}).length > 0 || legacyManagedIdentitySelected),
    [isUsingOAuth, isMultiAuth, capabilityEnabledParameters, legacyManagedIdentitySelected]
  );

  const [connectionDisplayName, setConnectionDisplayName] = useState<string>('');
  const validParams = useMemo(() => {
    if (showNameInput && !connectionDisplayName) return false;
    if (
      resourceSelectorProps &&
      ((resourceSelectorProps?.fetchSubResourcesCallback && !resourceSelectorProps?.selectedSubResource) ||
        !resourceSelectorProps?.selectedResourceId)
    )
      return false;
    if (Object.keys(capabilityEnabledParameters ?? {}).length === 0) return true;
    return Object.entries(capabilityEnabledParameters).every(
      ([key, parameter]) => parameter?.uiDefinition?.constraints?.required !== 'true' || !!parameterValues[key]
    );
  }, [showNameInput, connectionDisplayName, resourceSelectorProps, capabilityEnabledParameters, parameterValues]);

  const canSubmit = useMemo(() => !isLoading && validParams, [isLoading, validParams]);

  const submitCallback = useCallback(async () => {
    if (!connector?.id) return;

    setIsLoading(true);
    setErrorMessage(undefined);

    const visibleParameterValues = Object.fromEntries(
      Object.entries(parameterValues).filter(([key]) => Object.keys(capabilityEnabledParameters).includes(key)) ?? []
    );

    // This value needs to be passed conditionally but the parameter is hidden, so we're manually inputting it here
    if (
      supportsServicePrincipalConnection &&
      Object.keys(unfilteredParameters).includes(SERVICE_PRINCIPLE_CONSTANTS.CONFIG_ITEM_KEYS.TOKEN_GRANT_TYPE)
    ) {
      visibleParameterValues[SERVICE_PRINCIPLE_CONSTANTS.CONFIG_ITEM_KEYS.TOKEN_GRANT_TYPE] = servicePrincipalSelected
        ? SERVICE_PRINCIPLE_CONSTANTS.GRANT_TYPE_VALUES.CLIENT_CREDENTIALS
        : SERVICE_PRINCIPLE_CONSTANTS.GRANT_TYPE_VALUES.CODE;
    }

    const identitySelected = legacyManagedIdentitySelected ? selectedManagedIdentity : undefined;

    try {
      const { connection, error } = await createConnection({
        displayName: showNameInput ? connectionDisplayName : undefined,
        selectedParameterSet: connectionParameterSets?.values[selectedParamSetIndex],
        isOAuthConnection: isUsingOAuth,
        parameterValues: visibleParameterValues,
        alternativeParameterValues: legacyManagedIdentitySelected ? {} : undefined,
        connector,
        operationManifest,
        connectionMetadata,
      });
      if (connection) {
        for (const nodeId of nodeIds) {
          applyNewConnection(nodeId, connection, identitySelected);
        }
        closeConnectionsFlow();
      } else if (error) {
        setErrorMessage(String(error));
      }
    } catch (error: any) {
      setErrorMessage(String(error?.responseText ?? error?.message));
      const message = `Failed to create connection: ${error}`;
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'create connection tab',
        message,
        error: error instanceof Error ? error : undefined,
      });
    }
    setIsLoading(false);
  }, [
    parameterValues,
    supportsServicePrincipalConnection,
    unfilteredParameters,
    legacyManagedIdentitySelected,
    selectedManagedIdentity,
    connector,
    capabilityEnabledParameters,
    servicePrincipalSelected,
    showNameInput,
    connectionDisplayName,
    connectionParameterSets?.values,
    selectedParamSetIndex,
    isUsingOAuth,
    operationManifest,
    connectionMetadata,
    closeConnectionsFlow,
    nodeIds,
    applyNewConnection,
  ]);

  const cancelCallback = useCallback(() => {
    dispatch(setIsCreatingConnection(false));
  }, [dispatch]);

  // INTL STRINGS

  const componentDescription = intl.formatMessage({
    defaultMessage: 'Create a new connection',
    description: 'General description for creating a new connection.',
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

  const legacyManagedIdentityLabelText = intl.formatMessage({
    defaultMessage: 'Managed Identity',
    description: 'Dropdown text for legacy managed identity connection',
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

  const showConfigParameters = useMemo(() => !resourceSelectorProps, [resourceSelectorProps]);

  const renderConnectionParameter = (key: string, parameter: ConnectionParameterSetParameter | ConnectionParameter) => {
    const connectionParameterProps: ConnectionParameterProps = {
      parameterKey: key,
      parameter,
      value: parameterValues[key],
      setValue: (val: any) => setParameterValues({ ...parameterValues, [key]: val }),
      isSubscriptionDropdownDisabled: gatewayServiceConfig?.disableSubscriptionLookup,
      isLoading,
      selectedSubscriptionId,
      selectSubscriptionCallback: (subscriptionId: string) => setSelectedSubscriptionId(subscriptionId),
      availableGateways,
      availableSubscriptions: subscriptions,
    };

    const customParameterOptions = ConnectionParameterEditorService()?.getConnectionParameterEditor({
      connectorId,
      parameterKey: key,
    });
    if (customParameterOptions) {
      const CustomConnectionParameter = customParameterOptions.EditorComponent;
      return <CustomConnectionParameter key={key} {...connectionParameterProps} />;
    }

    return <UniversalConnectionParameter key={key} {...connectionParameterProps} />;
  };

  // Connection parameters mapping allows grouping several parameters into one custom editor.
  // Keep track of encountered and active mappings to avoid rendering the same mapping multiple times, or rendering the included parameters.
  const allParameterMappings = new Set<string>();
  const activeParameterMappings = new Set<string>();
  const renderCredentialsMappingParameter = (mappingName: string, parameter: ConnectionParameterSetParameter | ConnectionParameter) => {
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
    return renderConnectionParameter(mappingName, parameter);
  };

  // RENDER

  if (connector?.properties === undefined)
    return (
      <div className="msla-loading-container">
        <Spinner size={'large'} label={loadingText} />
      </div>
    );

  return (
    <div className="msla-edit-connection-container">
      <ActionList nodeIds={nodeIds} iconUri={iconUri} />
      <Divider />

      <Body1Strong>{componentDescription}</Body1Strong>

      <div className="msla-create-connection-container">
        {/* Error Bar */}
        {errorMessage && (
          <MessageBar
            messageBarType={MessageBarType.error}
            isMultiline={true}
            onDismiss={() => setErrorMessage(undefined)}
            dismissButtonAriaLabel={closeErrorButtonAriaLabel}
          >
            {errorMessage}
          </MessageBar>
        )}

        {/* Parameters */}
        <div className="connection-params-container">
          {/* Legacy Multi-Auth */}
          {showLegacyMultiAuth && (
            <LegacyMultiAuth
              isLoading={isLoading}
              value={selectedParamSetIndex}
              onChange={onAuthDropdownChange}
              supportsServicePrincipalConnection={supportsServicePrincipalConnection}
              supportsLegacyManagedIdentityConnection={supportsLegacyManagedIdentityConnection}
            />
          )}

          {/* OptionalGateway Checkbox */}
          {!hasOnlyOnPremGateway && Object.entries(getParametersByCapability(Capabilities.gateway)).length > 0 && (
            <LegacyGatewayCheckbox
              isLoading={isLoading}
              value={enabledCapabilities.includes(Capabilities.gateway)}
              onChange={() => toggleCapability(Capabilities.gateway)}
            />
          )}

          {/* Name */}
          {showNameInput && (
            <ConnectionNameInput
              isLoading={isLoading}
              value={connectionDisplayName}
              onChange={(e: any, val?: string) => setConnectionDisplayName(val ?? '')}
            />
          )}

          {/* Legacy Managed Identity Selection */}
          {legacyManagedIdentitySelected && (
            <div className="param-row">
              <Label className="label" required htmlFor={'connection-param-set-select'} disabled={isLoading}>
                {legacyManagedIdentityLabelText}
              </Label>
              <LegacyManagedIdentityDropdown identity={identity} onChange={onLegacyManagedIdentityChange} disabled={isLoading} />
            </div>
          )}

          {/* Authentication Selection */}
          {isMultiAuth && (
            <ConnectionMultiAuthInput
              isLoading={isLoading}
              value={selectedParamSetIndex}
              onChange={onAuthDropdownChange}
              connectionParameterSets={connectionParameterSets}
            />
          )}

          {/* Connector Parameters */}
          {showConfigParameters &&
            Object.entries(capabilityEnabledParameters)?.map(
              ([key, parameter]: [string, ConnectionParameterSetParameter | ConnectionParameter]) => {
                const mappingName = parameter?.uiDefinition?.credentialMapping?.mappingName;
                if (mappingName) {
                  // This parameter belongs to a mapping - try to render a custom editor if supported.
                  return renderCredentialsMappingParameter(mappingName, parameter);
                }
                return renderConnectionParameter(key, parameter);
              }
            )}

          {/* Resource Selector UI */}
          {resourceSelectorProps && <AzureResourcePicker {...resourceSelectorProps} />}
        </div>

        {/* Descriptor text for simple and oauth */}
        <div>{connectorDescription}</div>
        {/* {needsAuth && <IFrameTermsOfService url={termsOfServiceUrl} />} */}
      </div>

      {/* Action Buttons */}
      <div className="msla-edit-connection-actions-container">
        <Button disabled={!canSubmit} aria-label={submitButtonAriaLabel} onClick={submitCallback}>
          {submitButtonText}
        </Button>
        {!hideCancelButton ? (
          <Button disabled={isLoading} aria-label={cancelButtonAria} onClick={cancelCallback}>
            {cancelButtonText}
          </Button>
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
