import { useMemo, type ReactNode } from 'react';
import { TemplateFilters, TemplatesDataProvider } from '@microsoft/logic-apps-designer';
import { environment, loadToken } from '../../environments/environment';
import { DevToolbox } from '../components/DevToolbox';
import type { RootState } from '../state/Store';
import { TemplatesDesigner, TemplatesDesignerProvider } from '@microsoft/logic-apps-designer';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import {
  BaseGatewayService,
  StandardTemplateService,
  BaseTenantService,
  StandardConnectionService,
  clone,
  escapeSpecialChars,
  isArmResourceId,
  optional,
  StandardOperationManifestService,
} from '@microsoft/logic-apps-shared';
import {
  getConnectionStandard,
  useAppSettings,
  useConnectionsData,
  useCurrentObjectId,
  useCurrentTenantId,
  useWorkflowApp,
} from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
import type { ConnectionAndAppSetting, ConnectionsData } from '../../designer/app/AzureLogicAppsDesigner/Models/Workflow';
import type { WorkflowApp } from '../../designer/app/AzureLogicAppsDesigner/Models/WorkflowApp';
import { ArmParser } from '../../designer/app/AzureLogicAppsDesigner/Utilities/ArmParser';
import { StandaloneOAuthService } from '../../designer/app/AzureLogicAppsDesigner/Services/OAuthService';
import { WorkflowUtility, addConnectionInJson, addOrUpdateAppSettings } from '../../designer/app/AzureLogicAppsDesigner/Utilities/Workflow';
import { HttpClient } from '../../designer/app/AzureLogicAppsDesigner/Services/HttpClient';
import type { Template, LogicAppsV2, IWorkflowService } from '@microsoft/logic-apps-shared';
import { saveWorkflowStandard } from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
import type { ParametersData } from '../../designer/app/AzureLogicAppsDesigner/Models/Workflow';
import axios from 'axios';
import type { ConnectionMapping } from '../../../../../libs/designer/src/lib/core/state/templates/workflowSlice';
import { parseWorkflowParameterValue } from '@microsoft/logic-apps-designer';

const workflowIdentifier = '#workflowname#';
const LoadWhenArmTokenIsLoaded = ({ children }: { children: ReactNode }) => {
  const { isLoading } = useQuery(['armToken'], loadToken);
  return isLoading ? null : <>{children}</>;
};
export const TemplatesStandaloneDesigner = () => {
  const theme = useSelector((state: RootState) => state.workflowLoader.theme);
  const { appId, isConsumption, workflowName: existingWorkflowName } = useSelector((state: RootState) => state.workflowLoader);
  const { data: workflowAppData } = useWorkflowApp(appId as string, isConsumption ? 'consumption' : 'standard');
  const canonicalLocation = WorkflowUtility.convertToCanonicalFormat(workflowAppData?.location ?? '');
  const { data: tenantId } = useCurrentTenantId();
  const { data: objectId } = useCurrentObjectId();
  const { data: originalConnectionsData } = useConnectionsData(appId);
  const { data: settingsData } = useAppSettings(appId as string);

  const connectionsData = useMemo(() => {
    return JSON.parse(JSON.stringify(clone(originalConnectionsData ?? {})));
  }, [originalConnectionsData]);

  const connectionReferences = WorkflowUtility.convertConnectionsDataToReferences(connectionsData);

  const createWorkflowCall = async (
    workflowName: string,
    workflowKind: string,
    workflowDefinition: LogicAppsV2.WorkflowDefinition,
    connectionsMapping: ConnectionMapping,
    parametersData: Record<string, Template.ParameterDefinition>
  ) => {
    const workflowNameToUse = existingWorkflowName ?? workflowName;
    if (appId) {
      if (isConsumption) {
        console.log('Consumption is not ready yet!');
      } else {
        let sanitizedWorkflowDefinitionString = JSON.stringify(workflowDefinition);
        const sanitizedParameterData: ParametersData = {};

        // Sanitizing parameter name & body
        Object.keys(parametersData).forEach((key) => {
          const parameter = parametersData[key];
          const sanitizedParameterName = replaceWithWorkflowName(parameter.name, workflowName);
          sanitizedParameterData[sanitizedParameterName] = {
            type: parameter.type,
            description: parameter?.description,
            value: parseWorkflowParameterValue(parameter.type, parameter?.value ?? parameter?.default),
          };
          sanitizedWorkflowDefinitionString = sanitizedWorkflowDefinitionString.replaceAll(
            `@parameters('${parameter.name}')`,
            `@parameters('${sanitizedParameterName}')`
          );
        });

        const {
          connectionsData: updatedConnectionsData,
          settingProperties: updatedSettingProperties,
          workflowJsonString: updatedWorkflowJsonString,
        } = await updateConnectionsDataWithNewConnections(
          connectionsData,
          settingsData?.properties,
          connectionsMapping,
          sanitizedWorkflowDefinitionString,
          workflowName
        );
        sanitizedWorkflowDefinitionString = updatedWorkflowJsonString;

        const workflow = {
          definition: JSON.parse(sanitizedWorkflowDefinitionString),
          kind: workflowKind,
        };

        const getExistingParametersData = async () => {
          try {
            const response = await axios.get(
              `https://management.azure.com${appId}/hostruntime/admin/vfs/parameters.json?api-version=2018-11-01&relativepath=1`,
              {
                headers: {
                  'If-Match': '*',
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${environment.armToken}`,
                },
              }
            );
            return response.data as ParametersData;
          } catch (error: any) {
            return error?.response?.status === 404 ? {} : undefined;
          }
        };
        try {
          const existingParametersData = await getExistingParametersData();

          if (!existingParametersData) {
            alert('Error fetching parameters');
            return;
          }

          const updatedParametersData: ParametersData = {
            ...existingParametersData,
            ...sanitizedParameterData,
          };
          await saveWorkflowStandard(
            appId,
            workflowNameToUse,
            workflow,
            updatedConnectionsData,
            updatedParametersData,
            updatedSettingProperties,
            undefined,
            () => {},
            true
          );
        } catch (error) {
          console.log(error);
        }
      }
    } else {
      console.log('Select App Id first!');
    }
  };

  const addConnectionDataInternal = async (connectionAndSetting: ConnectionAndAppSetting): Promise<void> => {
    addConnectionInJson(connectionAndSetting, connectionsData ?? {});
    addOrUpdateAppSettings(connectionAndSetting.settings, settingsData?.properties ?? {});
  };

  const services = useMemo(
    () =>
      getServices(
        isConsumption,
        connectionsData ?? {},
        workflowAppData as WorkflowApp,
        addConnectionDataInternal,
        tenantId,
        objectId,
        canonicalLocation
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connectionsData, settingsData, workflowAppData, tenantId, canonicalLocation]
  );
  const resourceDetails = new ArmParser(appId ?? '');
  return (
    <LoadWhenArmTokenIsLoaded>
      <DevToolbox />
      {workflowAppData ? (
        <TemplatesDesignerProvider locale="en-US" theme={theme}>
          <TemplatesDataProvider
            resourceDetails={{
              subscriptionId: resourceDetails.subscriptionId,
              resourceGroup: resourceDetails.resourceGroup,
              location: canonicalLocation,
            }}
            connectionReferences={connectionReferences}
            services={services}
            isConsumption={isConsumption}
            existingWorkflowName={existingWorkflowName}
          >
            <div
              style={{
                margin: '20px',
              }}
            >
              <TemplateFilters
                detailFilters={{
                  Categories: {
                    displayName: 'Category',
                    items: [
                      {
                        value: 'Design Patterns',
                        displayName: 'Design Patterns',
                      },
                      {
                        value: 'Generative AI',
                        displayName: 'Generative AI',
                      },
                      {
                        value: 'B2B',
                        displayName: 'B2B',
                      },
                      {
                        value: 'EDI',
                        displayName: 'EDI',
                      },
                      {
                        value: 'Approval',
                        displayName: 'Approval',
                      },
                    ],
                  },
                }}
              />
              <br />
              <TemplatesDesigner createWorkflowCall={createWorkflowCall} />
            </div>
          </TemplatesDataProvider>
        </TemplatesDesignerProvider>
      ) : null}
    </LoadWhenArmTokenIsLoaded>
  );
};

const apiVersion = '2020-06-01';
const httpClient = new HttpClient();

const getServices = (
  isConsumption: boolean,
  connectionsData: ConnectionsData,
  workflowApp: WorkflowApp | undefined,
  addConnection: (data: ConnectionAndAppSetting) => Promise<void>,
  tenantId: string | undefined,
  objectId: string | undefined,
  location: string
): any => {
  const siteResourceId = workflowApp?.id;
  const armUrl = 'https://management.azure.com';
  const baseUrl = `${armUrl}${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management`;
  const appName = workflowApp?.name ?? '';
  const { subscriptionId, resourceGroup } = new ArmParser(siteResourceId ?? '');

  const defaultServiceParams = { baseUrl, httpClient, apiVersion };

  const connectionService = new StandardConnectionService({
    ...defaultServiceParams,
    apiHubServiceDetails: {
      apiVersion: '2018-07-01-preview',
      baseUrl: armUrl,
      subscriptionId,
      resourceGroup,
      location,
      tenantId,
      httpClient,
    },
    workflowAppDetails: { appName, identity: workflowApp?.identity as any },
    readConnections: () => Promise.resolve(connectionsData),
    writeConnection: addConnection as any,
  });
  const gatewayService = new BaseGatewayService({
    baseUrl: armUrl,
    httpClient,
    apiVersions: {
      subscription: apiVersion,
      gateway: '2016-06-01',
    },
  });
  const tenantService = new BaseTenantService({
    baseUrl: armUrl,
    httpClient,
    apiVersion: '2017-08-01',
  });
  const oAuthService = new StandaloneOAuthService({
    ...defaultServiceParams,
    apiVersion: '2018-07-01-preview',
    subscriptionId,
    resourceGroup,
    location,
    tenantId,
    objectId,
  });
  const operationManifestService = new StandardOperationManifestService(defaultServiceParams);
  const workflowService: IWorkflowService = {
    getCallbackUrl: () => Promise.resolve({} as any),
    getAppIdentity: () => workflowApp?.identity as any,
  };

  const templateService = isConsumption
    ? undefined
    : new StandardTemplateService({
        baseUrl: armUrl,
        appId: siteResourceId,
        httpClient,
        apiVersions: {
          subscription: apiVersion,
          gateway: '2018-11-01',
        },
        openBladeAfterCreate: () => {
          console.log('Open blade after create');
        },
      });

  return {
    connectionService,
    gatewayService,
    tenantService,
    oAuthService,
    operationManifestService,
    templateService,
    workflowService,
  };
};

const replaceWithWorkflowName = (content: string, workflowName: string) => content.replaceAll(workflowIdentifier, workflowName);

const updateConnectionsDataWithNewConnections = async (
  originalConnectionsData: ConnectionsData,
  settingProperties: Record<string, string>,
  connections: ConnectionMapping,
  workflowJsonString: string,
  workflowName: string
): Promise<{ connectionsData: ConnectionsData; settingProperties: Record<string, string>; workflowJsonString: string }> => {
  const { references, mapping } = connections;
  let updatedSettings = { ...settingProperties };
  const updatedConnectionsData = { ...originalConnectionsData };
  let updatedWorkflowJsonString = workflowJsonString;
  let updatedConnectionsJsonString = JSON.stringify(updatedConnectionsData);
  const referencesToProcess: string[] = [];

  for (const connectionKey of Object.keys(mapping)) {
    const referenceKey = mapping[connectionKey];
    if (connectionKey === referenceKey) {
      referencesToProcess.push(referenceKey);
    } else {
      updatedWorkflowJsonString = updatedWorkflowJsonString.replaceAll(connectionKey, referenceKey);
    }
  }

  if (referencesToProcess.length) {
    const newManagedApiConnections = updatedConnectionsData.managedApiConnections ?? {};
    const referencesToNormalize: string[] = [];
    await Promise.all(
      referencesToProcess.map(async (referenceKey) => {
        const reference = references[referenceKey];
        const normalizedReferenceKey = replaceWithWorkflowName(referenceKey, workflowName);
        if (isArmResourceId(reference?.connection?.id)) {
          // Managed API Connection
          const {
            api: { id: apiId },
            connection: { id: connectionId },
            connectionProperties,
          } = reference;
          const connection = await getConnectionStandard(connectionId);
          const userIdentity = connectionProperties?.authentication?.identity;
          const newConnectionObj = {
            api: { id: apiId },
            connection: { id: connectionId },
            authentication: {
              type: 'ManagedServiceIdentity',
              ...optional('identity', userIdentity),
            },
            connectionRuntimeUrl: connection?.properties?.connectionRuntimeUrl ?? '',
            connectionProperties,
          };

          newManagedApiConnections[normalizedReferenceKey] = newConnectionObj;
        } else {
          referencesToNormalize.push(referenceKey);
        }

        updatedWorkflowJsonString = updatedWorkflowJsonString.replaceAll(referenceKey, normalizedReferenceKey);
      })
    );
    updatedConnectionsData.managedApiConnections = newManagedApiConnections;

    updatedConnectionsJsonString = JSON.stringify(updatedConnectionsData);
    for (const referenceKey of referencesToNormalize) {
      const normalizedReferenceKey = replaceWithWorkflowName(referenceKey, workflowName);
      const escapedReferenceKeyForSettings = escapeSpecialChars(referenceKey);
      const normalizedEscapedReferenceKeyForSettings = replaceWithWorkflowName(escapedReferenceKeyForSettings, workflowName);

      updatedConnectionsJsonString = updatedConnectionsJsonString.replaceAll(referenceKey, normalizedReferenceKey);
      updatedConnectionsJsonString = updatedConnectionsJsonString.replaceAll(
        escapedReferenceKeyForSettings,
        normalizedEscapedReferenceKeyForSettings
      );
      updatedSettings = updateSettingsKeyWithWorkflowName(
        updatedSettings,
        escapedReferenceKeyForSettings,
        normalizedEscapedReferenceKeyForSettings
      );
    }
  }

  return {
    connectionsData: JSON.parse(updatedConnectionsJsonString),
    settingProperties: updatedSettings,
    workflowJsonString: updatedWorkflowJsonString,
  };
};

const updateSettingsKeyWithWorkflowName = (
  settingProperties: Record<string, string>,
  referenceKey: string,
  normalizedReferenceKey: string
): Record<string, string> => {
  const updatedSettings = { ...settingProperties };
  for (const key of Object.keys(settingProperties)) {
    if (key.includes(referenceKey)) {
      const normalizedKey = key.replace(referenceKey, normalizedReferenceKey);
      updatedSettings[normalizedKey] = settingProperties[key];
      delete updatedSettings[key];
    }
  }

  return updatedSettings;
};
