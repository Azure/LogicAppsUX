import constants from '../../../../common/constants';
import type { AppDispatch, RootState } from '../../../../core';
import { useOperationInfo, useSelectedNodeId } from '../../../../core';
import type { ConnectionPayload } from '../../../../core/actions/bjsworkflow/connections';
import {
  getConnectionMetadata,
  getConnectionProperties,
  getApiHubAuthentication,
  updateNodeConnection,
  needsOAuth,
} from '../../../../core/actions/bjsworkflow/connections';
import { getUniqueConnectionName } from '../../../../core/queries/connections';
import {
  useConnectorByNodeId,
  useGatewayServiceConfig,
  useGateways,
  useSubscriptions,
} from '../../../../core/state/connection/connectionSelector';
import { useMonitoringView } from '../../../../core/state/designerOptions/designerOptionsSelectors';
import { showDefaultTabs, setIsCreatingConnection } from '../../../../core/state/panel/panelSlice';
import { useOperationManifest } from '../../../../core/state/selectors/actionMetadataSelector';
import {
  getAssistedConnectionProps,
  getConnectionParametersForAzureConnection,
  getSupportedParameterSets,
} from '../../../../core/utils/connectors/connections';
import LegacyManagedIdentityDropdown from './legacyManagedIdentityPicker';
import type { ConnectionParameterProps } from './universalConnectionParameter';
import { UniversalConnectionParameter } from './universalConnectionParameter';
import type { IDropdownOption } from '@fluentui/react';
import { MessageBarType, MessageBar, Checkbox, Dropdown, Icon, Label, TextField, TooltipHost } from '@fluentui/react';
import { Button, Spinner } from '@fluentui/react-components';
import {
  ConnectionParameterEditorService,
  ConnectionService,
  LogEntryLevel,
  LoggerService,
  WorkflowService,
} from '@microsoft/designer-client-services-logic-apps';
import type {
  ConnectionCreationInfo,
  ConnectionParametersMetadata,
  IConnectionCredentialMappingEditorProps,
} from '@microsoft/designer-client-services-logic-apps';
import { AzureResourcePicker } from '@microsoft/designer-ui';
import type {
  Connection,
  ConnectionParameter,
  ConnectionParameterSet,
  ConnectionParameterSetParameter,
  ConnectionParameterSetValues,
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

const LegacyMultiAuthOptions = {
  oauth: 0,
  servicePrincipal: 1,
  managedIdentity: 2,
} as const;
type LegacyMultiAuthOptions = (typeof LegacyMultiAuthOptions)[keyof typeof LegacyMultiAuthOptions];

export const CreateConnection = () => {
  const dispatch = useDispatch<AppDispatch>();

  const intl = useIntl();
  const nodeId: string = useSelectedNodeId();
  const connector = useConnectorByNodeId(nodeId);
  const operationInfo = useOperationInfo(nodeId);
  const { data: operationManifest } = useOperationManifest(operationInfo);
  const connectionMetadata = getConnectionMetadata(operationManifest);
  const hasExistingConnection = useSelector((state: RootState) => !!state.connections.connectionsMapping[nodeId]);
  const isMonitoringView = useMonitoringView();

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
    (newConnection: Connection, selectedIdentity?: string) => {
      const payload: ConnectionPayload = { nodeId, connection: newConnection, connector: connector as Connector };

      if (selectedIdentity) {
        const userAssignedIdentity = selectedIdentity !== constants.SYSTEM_ASSIGNED_MANAGED_IDENTITY ? selectedIdentity : undefined;
        payload.connectionProperties = getConnectionProperties(connector as Connector, userAssignedIdentity);
        payload.authentication = getApiHubAuthentication(userAssignedIdentity);
      }

      dispatch(updateNodeConnection(payload));
    },
    [connector, dispatch, nodeId]
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

  const createConnectionCallback = useCallback(
    async (
      displayName?: string,
      selectedParameterSet?: ConnectionParameterSet,
      parameterValues: Record<string, any> = {},
      isOAuthConnection?: boolean,
      alternativeParameterValues?: Record<string, any>,
      identitySelected?: string
    ) => {
      if (!connector?.id) return;

      setIsLoading(true);
      setErrorMessage(undefined);

      let outputParameterValues = parameterValues;

      if (selectedParameterSet) {
        const requiredParameters = Object.entries(selectedParameterSet?.parameters)?.filter(
          ([, parameter]) => parameter?.uiDefinition?.constraints?.required === 'true'
        );
        requiredParameters?.forEach(([key, parameter]) => {
          if (!outputParameterValues?.[key]) {
            outputParameterValues[key] = parameter?.uiDefinition?.constraints?.default;
          }
        });
      }

      try {
        // Assign connection parameters from resource selector experience
        if (assistedConnectionProps) {
          const assistedParams = await getConnectionParametersForAzureConnection(
            operationManifest?.properties.connection?.type,
            selectedSubResource
          );
          outputParameterValues = { ...outputParameterValues, ...assistedParams };
        }

        // If oauth, find the oauth parameter and assign the redirect url
        if (isOAuthConnection && selectedParameterSet) {
          const oAuthParameter = Object.entries(selectedParameterSet?.parameters).find(
            ([_, parameter]) => !!parameter?.oAuthSettings?.redirectUrl
          );
          if (oAuthParameter) {
            const oAuthParameterKey = oAuthParameter?.[0];
            const oAuthParameterObj = oAuthParameter?.[1];
            const redirectUrl = oAuthParameterObj?.oAuthSettings?.redirectUrl;
            outputParameterValues[oAuthParameterKey] = redirectUrl;
          }
        }

        const connectionParameterSetValues: ConnectionParameterSetValues = {
          name: selectedParameterSet?.name ?? '',
          values: Object.keys(outputParameterValues).reduce((acc: any, key) => {
            // eslint-disable-next-line no-param-reassign
            acc[key] = { value: outputParameterValues[key] };
            return acc;
          }, {}),
        };

        const connectionInfo: ConnectionCreationInfo = {
          displayName,
          connectionParametersSet: selectedParameterSet ? connectionParameterSetValues : undefined,
          connectionParameters: outputParameterValues,
          alternativeParameterValues,
        };

        const parametersMetadata: ConnectionParametersMetadata = {
          connectionMetadata: connectionMetadata,
          connectionParameterSet: selectedParameterSet,
          connectionParameters: selectedParameterSet?.parameters ?? connector?.properties.connectionParameters,
        };

        let connection, err;

        const newName = await getUniqueConnectionName(connector.id);
        if (isOAuthConnection) {
          await ConnectionService()
            .createAndAuthorizeOAuthConnection(newName, connector?.id ?? '', connectionInfo, parametersMetadata)
            .then(({ connection: c, errorMessage }) => {
              connection = c;
              err = errorMessage;
            })
            .catch((errorMessage) => (err = errorMessage));
        } else {
          await ConnectionService()
            .createConnection(newName, connector, connectionInfo, parametersMetadata)
            .then((c) => (connection = c))
            .catch((errorMessage) => (err = errorMessage));
        }

        if (connection) {
          applyNewConnection(connection, identitySelected);
          dispatch(showDefaultTabs({ isMonitoringView }));
        } else if (err) {
          setErrorMessage(String(err));
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
    },
    [
      applyNewConnection,
      assistedConnectionProps,
      connectionMetadata,
      connector,
      dispatch,
      operationManifest?.properties.connection?.type,
      selectedSubResource,
      isMonitoringView,
    ]
  );

  const cancelCallback = useCallback(() => {
    dispatch(setIsCreatingConnection(false));
  }, []);

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
    defaultMessage: "Select this checkbox if you're setting up an on-premises connection.",
    description: 'Tooltip for the on-premises data gateway connection checkbox',
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

      {/* Action Buttons */}
      <div className="msla-create-connection-actions-container">
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
