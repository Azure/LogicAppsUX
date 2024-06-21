import { useMemo, type ReactNode } from 'react';
import { TemplatesDataProvider } from '@microsoft/logic-apps-designer';
import { environment, loadToken } from '../../environments/environment';
import { DevToolbox } from '../components/DevToolbox';
import type { RootState } from '../state/Store';
import { TemplatesDesigner, TemplatesDesignerProvider } from '@microsoft/logic-apps-designer';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { BaseGatewayService, BaseTemplateService, BaseTenantService, StandardConnectionService } from '@microsoft/logic-apps-shared';
import {
  useAppSettings,
  useConnectionsData,
  useCurrentObjectId,
  useCurrentTenantId,
  useWorkflowApp,
} from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
import type { ConnectionsData } from '../../designer/app/AzureLogicAppsDesigner/Models/Workflow';
import type { WorkflowApp } from '../../designer/app/AzureLogicAppsDesigner/Models/WorkflowApp';
import { ArmParser } from '../../designer/app/AzureLogicAppsDesigner/Utilities/ArmParser';
import { StandaloneOAuthService } from '../../designer/app/AzureLogicAppsDesigner/Services/OAuthService';
import { WorkflowUtility } from '../../designer/app/AzureLogicAppsDesigner/Utilities/Workflow';
import { HttpClient } from '../../designer/app/AzureLogicAppsDesigner/Services/HttpClient';
import type { Template, LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { saveWorkflowStandard } from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
import type { ParametersData } from '../../designer/app/AzureLogicAppsDesigner/Models/Workflow';
import axios from 'axios';

const LoadWhenArmTokenIsLoaded = ({ children }: { children: ReactNode }) => {
  const { isLoading } = useQuery(['armToken'], loadToken);
  return isLoading ? null : <>{children}</>;
};
export const TemplatesStandaloneDesigner = () => {
  const theme = useSelector((state: RootState) => state.workflowLoader.theme);
  const { appId, isConsumption, workflowName: existingWorkflowName } = useSelector((state: RootState) => state.workflowLoader);
  const { data: workflowAppData } = useWorkflowApp(appId as string);
  const canonicalLocation = WorkflowUtility.convertToCanonicalFormat(workflowAppData?.location ?? '');
  const { data: tenantId } = useCurrentTenantId();
  const { data: objectId } = useCurrentObjectId();
  const { data: connectionsData } = useConnectionsData(appId);
  const { data: settingsData } = useAppSettings(appId as string);

  const sanitizeParameterName = (parameterName: string, workflowName: string) =>
    parameterName.replace('_#workflowname#', `_${workflowName}`);

  const createWorkflowCall = async (
    workflowName: string,
    workflowKind: string,
    workflowDefinition: LogicAppsV2.WorkflowDefinition,
    _connectionsData: any,
    parametersData: Record<string, Template.ParameterDefinition>
  ) => {
    const workflowNameToUse = existingWorkflowName ?? workflowName;
    if (appId) {
      if (isConsumption) {
        console.log('Consumption is not ready yet!');
        // await saveWorkflowConsumption({
        //   id: appId,
        //   name: workflowNameToUse,
        //   type: "json", //TODO: figure out what this type is and replace it
        //   kind: workflowKind,
        //   properties: {
        //     files: {
        //       [Artifact.WorkflowFile]: workflow,
        //       [Artifact.ParametersFile]: parametersData as ParametersData,
        //       [Artifact.ConnectionsFile]: _connectionsData
        //     },
        //     health: {},
        //   }
        // }, workflow);
      } else {
        let sanitizedWorkflowDefinitionString = JSON.stringify(workflowDefinition);
        const sanitizedParameterData: ParametersData = {};

        // Sanitizing parameter name & body
        Object.keys(parametersData).forEach((key) => {
          const parameter = parametersData[key];
          const sanitizedParameterName = sanitizeParameterName(parameter.name, workflowName);
          sanitizedParameterData[sanitizedParameterName] = {
            type: parameter.type,
            description: parameter?.description,
            value: parameter?.value ?? parameter?.default,
          };
          sanitizedWorkflowDefinitionString = sanitizedWorkflowDefinitionString.replaceAll(
            `@parameters('${parameter.name}')`,
            `@parameters('${sanitizedParameterName}')`
          );
        });

        const workflow = {
          definition: JSON.parse(sanitizedWorkflowDefinitionString),
          connectionReferences: undefined, //TODO: change this after connections is done
          parameters: sanitizedParameterData,
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
            undefined,
            updatedParametersData,
            undefined,
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

  const services = useMemo(
    () => getServices(connectionsData ?? {}, workflowAppData as WorkflowApp, tenantId, objectId, canonicalLocation),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connectionsData, settingsData, workflowAppData, appId, tenantId, canonicalLocation]
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
            services={services}
            isConsumption={isConsumption}
            existingWorkflowName={existingWorkflowName}
          >
            <TemplatesDesigner createWorkflowCall={createWorkflowCall} />
          </TemplatesDataProvider>
        </TemplatesDesignerProvider>
      ) : null}
    </LoadWhenArmTokenIsLoaded>
  );
};

const apiVersion = '2020-06-01';
const httpClient = new HttpClient();

const getServices = (
  connectionsData: ConnectionsData,
  workflowApp: WorkflowApp | undefined,
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

  const templateService = new BaseTemplateService({
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
    templateService,
  };
};
