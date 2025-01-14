import { useMemo } from 'react';
import { TemplatesDataProvider } from '@microsoft/logic-apps-designer';
import type { RootState } from '../state/Store';
import { TemplatesDesigner, TemplatesDesignerProvider } from '@microsoft/logic-apps-designer';
import { useSelector } from 'react-redux';
import {
  BaseGatewayService,
  StandardTemplateService,
  BaseTenantService,
  StandardConnectionService,
  // clone,
  // escapeSpecialChars,
  // isArmResourceId,
  // optional,
  StandardOperationManifestService,
  ConsumptionConnectionService,
  // guid,
  // setObjectPropertyValue,
  ResourceIdentityType,
  BaseOAuthService,
  ConsumptionOperationManifestService,
} from '@microsoft/logic-apps-shared';
// import {
// getConnectionStandard,
// getWorkflowAndArtifactsConsumption,
// saveWorkflowConsumption,
// useAppSettings,
// useConnectionsData,
// useCurrentObjectId,
// useCurrentTenantId,
// useWorkflowApp,
// } from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
// import type { ConnectionsData } from '../../designer/app/AzureLogicAppsDesigner/Models/Workflow';
// import type { WorkflowApp } from '../../designer/app/AzureLogicAppsDesigner/Models/WorkflowApp';
// import { ArmParser } from '../../designer/app/AzureLogicAppsDesigner/Utilities/ArmParser';
// import { StandaloneOAuthService } from '../../designer/app/AzureLogicAppsDesigner/Services/OAuthService';
// import { WorkflowUtility, addConnectionInJson, addOrUpdateAppSettings } from '../../designer/app/AzureLogicAppsDesigner/Utilities/Workflow';
import { HttpClient } from '../../designer/app/AzureLogicAppsDesigner/Services/HttpClient';
// import type { Template, LogicAppsV2, IWorkflowService } from '@microsoft/logic-apps-shared';
// import { saveWorkflowStandard } from '../../designer/app/AzureLogicAppsDesigner/Services/WorkflowAndArtifacts';
// import type { ParametersData } from '../../designer/app/AzureLogicAppsDesigner/Models/Workflow';
// import axios from 'axios';
// import type { ConnectionMapping } from '@microsoft/logic-apps-designer/src/lib/core/state/templates/workflowSlice';
// import { parseWorkflowParameterValue } from '@microsoft/logic-apps-designer';
import { BaseTemplateService } from '@microsoft/logic-apps-shared';

// interface StringifiedWorkflow {
//   name: string;
//   kind: string;
//   definition: string;
// }

// const workflowIdentifier = '#workflowname#';
export const TemplatesStandaloneDesigner = () => {
  const theme = useSelector((state: RootState) => state.workflowLoader.theme);
  const {
    // appId,
    hostingPlan,
    // workflowName: existingWorkflowName,
    // resourcePath: workflowId,
  } = useSelector((state: RootState) => state.workflowLoader);
  // const { data: workflowAppData } = useWorkflowApp(appId as string, hostingPlan);
  // const canonicalLocation = WorkflowUtility.convertToCanonicalFormat(workflowAppData?.location ?? '');
  // const { data: tenantId } = useCurrentTenantId();
  // const { data: objectId } = useCurrentObjectId();
  // const { data: originalConnectionsData } = useConnectionsData(appId);
  // const { data: originalSettingsData } = useAppSettings(appId as string);
  const isConsumption = hostingPlan === 'consumption';

  // const connectionReferences = useMemo(() => WorkflowUtility.convertConnectionsDataToReferences(connectionsData()), [connectionsData]);

  const createWorkflowCall = async () => {
    alert("Congrats you created the workflow! (Not really, you're in standalone)");
  };

  const services = useMemo(
    () => getServices(isConsumption),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isConsumption]
  );

  return (
    <TemplatesDesignerProvider locale="en-US" theme={theme}>
      <TemplatesDataProvider
        resourceDetails={{
          subscriptionId: '',
          resourceGroup: '',
          location: '',
          workflowAppName: '',
        }}
        connectionReferences={{}}
        services={services}
        isConsumption={isConsumption}
        existingWorkflowName={undefined}
      >
        <div
          style={{
            margin: '20px',
          }}
        >
          <TemplatesDesigner
            detailFilters={{
              Category: {
                displayName: 'Categories',
                items: [
                  {
                    value: 'Design Patterns',
                    displayName: 'Design Patterns',
                  },
                  {
                    value: 'AI',
                    displayName: 'AI',
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
                  {
                    value: 'RAG',
                    displayName: 'RAG',
                  },
                  {
                    value: 'Automation',
                    displayName: 'Automation',
                  },
                  {
                    value: 'BizTalk Migration',
                    displayName: 'BizTalk Migration',
                  },
                  {
                    value: 'Mainframe Modernization',
                    displayName: 'Mainframe Modernization',
                  },
                ],
              },
            }}
            createWorkflowCall={createWorkflowCall}
          />
        </div>
      </TemplatesDataProvider>
    </TemplatesDesignerProvider>
  );
};

const httpClient = new HttpClient();

const getServices = (isConsumption: boolean): any => {
  const connectionService = isConsumption
    ? new ConsumptionConnectionService({
        apiVersion: '2018-07-01-preview',
        baseUrl: '/baseUrl',
        subscriptionId: '',
        resourceGroup: '',
        location: '',
        httpClient,
      })
    : new StandardConnectionService({
        baseUrl: '/url',
        apiVersion: '2018-11-01',
        httpClient,
        apiHubServiceDetails: {
          apiVersion: '2018-07-01-preview',
          baseUrl: '/baseUrl',
          subscriptionId: '',
          resourceGroup: '',
          location: '',
          httpClient,
        },
        workflowAppDetails: {
          appName: 'app',
          identity: { type: ResourceIdentityType.SYSTEM_ASSIGNED },
        },
        readConnections: () => Promise.resolve({}),
      });
  const gatewayService = new BaseGatewayService({
    baseUrl: '/url',
    httpClient,
    apiVersions: {
      subscription: '2018-11-01',
      gateway: '2016-06-01',
    },
  });
  const tenantService = new BaseTenantService({
    baseUrl: '/url',
    apiVersion: '2017-08-01',
    httpClient,
  });
  const oAuthService = new BaseOAuthService({
    apiVersion: '2018-11-01',
    baseUrl: '/url',
    httpClient,
    subscriptionId: '',
    resourceGroup: '',
    location: '',
  });
  const operationManifestService = isConsumption
    ? new ConsumptionOperationManifestService({
        apiVersion: '2018-11-01',
        baseUrl: '/url',
        httpClient,
        subscriptionId: 'subid',
        location: 'location',
      })
    : new StandardOperationManifestService({
        apiVersion: '2018-11-01',
        baseUrl: '/url',
        httpClient,
      });
  const workflowService = {
    getCallbackUrl: () => Promise.resolve({ method: 'POST', value: 'Dummy url' }),
  };

  const templateService = isConsumption
    ? new BaseTemplateService({
        openBladeAfterCreate: (_workflowName: string | undefined) => {
          window.alert('Open blade after create, consumption creation is complete');
        },
        onAddBlankWorkflow: () => {
          console.log('On add blank workflow click');
        },
      })
    : new StandardTemplateService({
        baseUrl: '/url',
        appId: 'siteResourceId', //TODO: double check
        httpClient,
        apiVersions: {
          subscription: 'subid',
          gateway: '2018-11-01',
        },
        openBladeAfterCreate: (workflowName: string | undefined) => {
          window.alert(`Open blade after create, workflowName is: ${workflowName}`);
        },
        onAddBlankWorkflow: () => {
          console.log('On add blank workflow click');
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
