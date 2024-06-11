import { useMemo, type ReactNode } from 'react';
import { TemplatesDataProvider } from '@microsoft/logic-apps-designer';
import { loadToken } from '../../environments/environment';
import { DevToolbox } from '../components/DevToolbox';
import type { RootState } from '../state/Store';
import { TemplatesDesigner, TemplatesDesignerProvider } from '@microsoft/logic-apps-designer';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { type Template, type LogicAppsV2, StandardConnectionService } from '@microsoft/logic-apps-shared';
import {
  saveWorkflowStandard,
  useAppSettings,
  useConnectionsData,
  useCurrentTenantId,
  useWorkflowApp,
} from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
import type { ConnectionAndAppSetting, ConnectionsData, ParametersData } from '../../designer/app/AzureLogicAppsDesigner/Models/Workflow';
import { ArmParser } from '../../designer/app/AzureLogicAppsDesigner/Utilities/ArmParser';
import { WorkflowUtility } from '../../designer/app/AzureLogicAppsDesigner/Utilities/Workflow';
import type { WorkflowApp } from '../../designer/app/AzureLogicAppsDesigner/Models/WorkflowApp';
import { FileSystemConnectionCreationClient } from '../../designer/app/AzureLogicAppsDesigner/Services/FileSystemConnectionCreationClient';
import { HttpClient } from '../../designer/app/AzureLogicAppsDesigner/Services/HttpClient';

const apiVersion = '2020-06-01';
const httpClient = new HttpClient();

const LoadWhenArmTokenIsLoaded = ({ children }: { children: ReactNode }) => {
  const { isLoading } = useQuery(['armToken'], loadToken);
  return isLoading ? null : <>{children}</>;
};

export const TemplatesStandaloneDesigner = () => {
  const theme = useSelector((state: RootState) => state.workflowLoader.theme);
  const { appId, isConsumption, workflowName: existingWorkflowName } = useSelector((state: RootState) => state.workflowLoader);
  const navigate = useNavigate();

  const { data: workflowAppData } = useWorkflowApp(appId);
  const { subscriptionId } = new ArmParser(appId ?? '');
  const canonicalLocation = WorkflowUtility.convertToCanonicalFormat(workflowAppData?.location ?? '');
  const { data: tenantId } = useCurrentTenantId();
  const { data: connectionsData } = useConnectionsData(appId);
  const { data: settingsData } = useAppSettings(appId);

  const addConnectionData = async (connectionAndSetting: ConnectionAndAppSetting): Promise<void> => {
    addConnectionInJson(connectionAndSetting, connectionsData ?? {});
    addOrUpdateAppSettings(connectionAndSetting.settings, settingsData?.properties ?? {});
  };

  // if appId is undefined, services is undefined too
  const services = useMemo(
    () =>
      appId &&
      getStandardConnectionServices(connectionsData, appId, canonicalLocation, tenantId, workflowAppData as WorkflowApp, addConnectionData),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connectionsData, appId, canonicalLocation, tenantId, workflowAppData]
  );

  const createWorkflowCall = async (
    workflowName: string,
    workflowKind: string,
    workflowDefinition: LogicAppsV2.WorkflowDefinition,
    _connectionsData: any,
    parametersData: Record<string, Template.ParameterDefinition>
  ) => {
    console.log('--create workflow call ');
    const workflowNameToUse = existingWorkflowName ?? workflowName;
    const workflow = {
      definition: workflowDefinition,
      connectionReferences: undefined, //TODO: change this after connections is done
      parameters: parametersData,
      kind: workflowKind,
    };
    const callBack = () => {
      console.log('Created workflow, TODO: now redirect');
      navigate('/');
    };
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
        console.log('calling create workflow standard');
        await saveWorkflowStandard(
          appId,
          workflowNameToUse,
          workflow,
          undefined,
          parametersData as ParametersData,
          undefined,
          undefined,
          callBack,
          true
        );
      }
    } else {
      console.log('Select App Id first!');
    }
  };

  return (
    <LoadWhenArmTokenIsLoaded>
      <DevToolbox />
      <TemplatesDesignerProvider locale="en-US" theme={theme}>
        <TemplatesDataProvider
          isConsumption={isConsumption}
          workflowName={existingWorkflowName}
          subscriptionId={subscriptionId}
          location={canonicalLocation}
          services={services}
        >
          <TemplatesDesigner createWorkflowCall={createWorkflowCall} />
        </TemplatesDataProvider>
      </TemplatesDesignerProvider>
    </LoadWhenArmTokenIsLoaded>
  );
};

const getStandardConnectionServices = (
  connectionsData: ConnectionsData,
  appId: string,
  location: string,
  tenantId: string | undefined,
  workflowApp: WorkflowApp,
  addConnection: (data: ConnectionAndAppSetting) => Promise<void>
): any => {
  const armUrl = 'https://management.azure.com';
  const baseUrl = `${armUrl}${appId}/hostruntime/runtime/webhooks/workflow/api/management`;
  const defaultServiceParams = { baseUrl, httpClient, apiVersion };
  const { subscriptionId, resourceGroup, topResourceName: appName } = new ArmParser(appId);

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
    connectionCreationClients: {
      FileSystem: new FileSystemConnectionCreationClient({
        baseUrl: armUrl,
        subscriptionId,
        resourceGroup,
        appName,
        apiVersion: '2022-03-01',
        httpClient,
      }),
    },
  });
  // todo: set up other services and connector service

  return {
    connectionService,
  };
};

const addConnectionInJson = (connectionAndSetting: ConnectionAndAppSetting, connectionsJson: ConnectionsData): void => {
  const { connectionData, connectionKey, pathLocation } = connectionAndSetting;

  let pathToSetConnectionsData: any = connectionsJson;

  for (const path of pathLocation) {
    if (!pathToSetConnectionsData[path]) {
      pathToSetConnectionsData[path] = {};
    }

    pathToSetConnectionsData = pathToSetConnectionsData[path];
  }

  if (pathToSetConnectionsData && pathToSetConnectionsData[connectionKey]) {
    // TODO: To show this in a notification of info bar on the blade.
    // const message = 'ConnectionKeyAlreadyExist - Connection key \'{0}\' already exists.'.format(connectionKey);
    return;
  }

  pathToSetConnectionsData[connectionKey] = connectionData;
};

const addOrUpdateAppSettings = (settings: Record<string, string>, originalSettings: Record<string, string>): Record<string, string> => {
  const settingsToAdd = Object.keys(settings);

  for (const settingKey of settingsToAdd) {
    if (originalSettings[settingKey]) {
      // TODO: To show this in a notification of info bar on the blade that key will be overriden.
    }

    // eslint-disable-next-line no-param-reassign
    originalSettings[settingKey] = settings[settingKey];
  }

  return originalSettings;
};
