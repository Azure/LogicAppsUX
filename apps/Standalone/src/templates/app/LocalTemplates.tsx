import { useMemo } from 'react';
import { TemplatesDataProvider, TemplatesView } from '@microsoft/logic-apps-designer';
import type { RootState } from '../state/Store';
import { TemplatesDesigner, TemplatesDesignerProvider } from '@microsoft/logic-apps-designer';
import { useSelector } from 'react-redux';
import {
  BaseGatewayService,
  StandardTemplateService,
  BaseTenantService,
  StandardConnectionService,
  StandardOperationManifestService,
  ConsumptionConnectionService,
  ResourceIdentityType,
  BaseOAuthService,
  ConsumptionOperationManifestService,
} from '@microsoft/logic-apps-shared';
import { HttpClient } from '../../designer/app/AzureLogicAppsDesigner/Services/HttpClient';
import { BaseTemplateService } from '@microsoft/logic-apps-shared';
import { useQuery } from '@tanstack/react-query';

const loadLocalTemplateFromResourcePath = async (resourcePath: string, artifactType = 'manifest') => {
  const paths = resourcePath.split('/');

  return paths.length === 2
    ? (await import(`./../../../../../__mocks__/templates/${paths[0]}/${paths[1]}/${artifactType}.json`)).default
    : (await import(`./../../../../../__mocks__/templates//${resourcePath}/${artifactType}.json`)).default;
};

const localTemplateManifestPaths = ['BasicWorkflowOnly', 'SimpleConnectionParameter', 'SimpleAccelerator', 'SimpleParametersOnly'];

export const LocalTemplates = () => {
  const { theme, templatesView } = useSelector((state: RootState) => ({
    theme: state.workflowLoader.theme,
    templatesView: state.workflowLoader.templatesView,
  }));
  const { hostingPlan } = useSelector((state: RootState) => state.workflowLoader);
  const { data: localManifests } = useQuery(
    ['getLocalTemplates'],
    async () => {
      const manifestPromises = localTemplateManifestPaths.map((resourcePath) =>
        loadLocalTemplateFromResourcePath(resourcePath).then((response) => [resourcePath, response])
      );
      const manifestsArray = await Promise.all(manifestPromises);
      return Object.fromEntries(manifestsArray);
    },
    { enabled: true }
  );

  const isConsumption = hostingPlan === 'consumption';

  const createWorkflowCall = async () => {
    alert("Congrats you created the workflow! (Not really, you're in standalone)");
  };

  const services = useMemo(
    () => getServices(isConsumption, loadLocalTemplateFromResourcePath),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isConsumption]
  );
  const isSingleTemplateView = useMemo(() => templatesView !== 'gallery', [templatesView]);

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
        isCreateView={!isConsumption}
        viewTemplate={isSingleTemplateView ? { id: templatesView } : undefined}
        customTemplates={localManifests}
        existingWorkflowName={undefined}
      >
        <div
          style={{
            margin: '20px',
          }}
        >
          {isSingleTemplateView ? (
            <TemplatesView createWorkflow={createWorkflowCall} showCloseButton={false} />
          ) : (
            <TemplatesDesigner
              detailFilters={{
                Category: {
                  displayName: 'Categories',
                  items: [
                    {
                      value: 'Mock',
                      displayName: 'Mock',
                    },
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
          )}
        </div>
      </TemplatesDataProvider>
    </TemplatesDesignerProvider>
  );
};

const httpClient = new HttpClient();

const getServices = (isConsumption: boolean, getLocalResource: (resourcePath: string) => Promise<any>): any => {
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
        onAddBlankWorkflow: async () => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          window.alert('On Blank Workflow Click');
        },
        getCustomResource: getLocalResource,
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
        onAddBlankWorkflow: async () => {
          window.alert('On Blank Workflow Click');
        },
        getCustomResource: getLocalResource,
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
