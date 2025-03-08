import { useEffect, useMemo, useState } from 'react';
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
  type Template,
  type LogicAppsV2,
  BaseTemplateService,
  type IResourceService,
} from '@microsoft/logic-apps-shared';
import { HttpClient } from '../../designer/app/AzureLogicAppsDesigner/Services/HttpClient';

const subscriptionId = 'one';
const resourceGroup = 'SecondRG';
const location = 'eastus';

const loadLocalTemplateFromResourcePath = async (resourcePath: string, artifactType = 'manifest') => {
  const paths = resourcePath.split('/');

  return paths.length === 2
    ? (await import(`./../../../../../__mocks__/templates/${paths[0]}/${paths[1]}/${artifactType}.json`)).default
    : (await import(`./../../../../../__mocks__/templates/${resourcePath}/${artifactType}.json`)).default;
};

const localTemplateManifestPaths = ['BasicWorkflowOnly', 'SimpleConnectionParameter', 'SimpleAccelerator', 'SimpleParametersOnly'];

export const LocalTemplates = () => {
  const { theme, templatesView } = useSelector((state: RootState) => ({
    theme: state.workflowLoader.theme,
    templatesView: state.workflowLoader.templatesView,
  }));
  const { hostingPlan, useEndpoint, isCreateView, enableResourceSelection } = useSelector((state: RootState) => state.workflowLoader);
  const [reload, setReload] = useState<boolean | undefined>(undefined);

  const isConsumption = hostingPlan === 'consumption';

  const createWorkflowCall = async () => {
    alert("Congrats you created the workflow! (Not really, you're in standalone)");
  };

  useEffect(() => {
    if (useEndpoint !== undefined) {
      setReload(true);
    }
  }, [useEndpoint]);

  const services = useMemo(
    () => getServices(isConsumption, !!useEndpoint),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isConsumption, useEndpoint]
  );
  const isSingleTemplateView = useMemo(() => templatesView !== 'gallery', [templatesView]);

  return (
    <TemplatesDesignerProvider locale="en-US" theme={theme}>
      <TemplatesDataProvider
        resourceDetails={{
          subscriptionId,
          resourceGroup,
          location,
          workflowAppName: 'app1',
        }}
        reload={reload}
        connectionReferences={{}}
        services={services}
        isConsumption={isConsumption}
        isCreateView={!isConsumption || !!isCreateView}
        enableResourceSelection={enableResourceSelection}
        existingWorkflowName={undefined}
        viewTemplate={
          isSingleTemplateView
            ? {
                id: templatesView,
                parametersOverride: {
                  'OpenAIEmbeddingModel_#workflowname#': { value: 'overriden-default-editable' },
                  'OpenAIChatModel_#workflowname#': { value: 'overriden-default-non-editable', isEditable: false },
                  'LogicMessage_#workflowname#': { value: 'overriden-default-non-editable', isEditable: false },
                },
                basicsOverride: {
                  ['default']: {
                    name: { value: 'overriden-name', isEditable: false },
                    kind: { value: 'stateful', isEditable: false },
                  },
                  ['Workflow1']: {
                    name: { value: 'overriden-name', isEditable: false },
                    kind: { value: 'stateful', isEditable: false },
                  },
                },
              }
            : undefined
        }
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

const getServices = (isConsumption: boolean, useEndpoint: boolean): any => {
  const connectionService = isConsumption
    ? new ConsumptionConnectionService({
        apiVersion: '2018-07-01-preview',
        baseUrl: '/baseUrl',
        subscriptionId,
        resourceGroup,
        location,
        httpClient,
      })
    : new StandardConnectionService({
        baseUrl: '/url',
        apiVersion: '2018-11-01',
        httpClient,
        apiHubServiceDetails: {
          apiVersion: '2018-07-01-preview',
          baseUrl: '/baseUrl',
          subscriptionId,
          resourceGroup,
          location,
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
    subscriptionId,
    resourceGroup,
    location,
  });
  const operationManifestService = isConsumption
    ? new ConsumptionOperationManifestService({
        apiVersion: '2018-11-01',
        baseUrl: '/url',
        httpClient,
        subscriptionId,
        location,
      })
    : new StandardOperationManifestService({
        apiVersion: '2018-11-01',
        baseUrl: '/url',
        httpClient,
      });
  const workflowService = {
    getCallbackUrl: () => Promise.resolve({ method: 'POST', value: 'Dummy url' }),
  };

  const baseService = new BaseTemplateService({
    endpoint: 'https://priti-cxf4h5cpcteue4az.b02.azurefd.net',
    useEndpointForTemplates: useEndpoint,
    openBladeAfterCreate: (workflowName: string | undefined) => {
      window.alert(`Open blade after create, workflowName is: ${workflowName}`);
    },
    onAddBlankWorkflow: async () => {
      window.alert('On Blank Workflow Click');
    },
    httpClient,
    baseUrl: '/url',
  });
  const templateService = new LocalTemplateService({
    service: baseService,
    endpoint: 'https://priti-cxf4h5cpcteue4az.b02.azurefd.net',
    useEndpointForTemplates: useEndpoint,
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
  });

  return {
    connectionService,
    gatewayService,
    tenantService,
    oAuthService,
    operationManifestService,
    templateService,
    workflowService,
    resourceService: new LocalResourceService(),
  };
};

class LocalTemplateService extends StandardTemplateService {
  constructor(private readonly _options: any) {
    super(_options);
  }

  getAllTemplateNames = async (): Promise<string[]> => {
    const localManifestNames = localTemplateManifestPaths;

    try {
      const manifestsFromGithub = await this._options.service.getAllTemplateNames();
      return [...localManifestNames, ...manifestsFromGithub];
    } catch {
      return localManifestNames;
    }
  };

  public getResourceManifest = async (resourcePath: string): Promise<Template.TemplateManifest | Template.WorkflowManifest> => {
    const templateId = resourcePath.split('/')[0];
    if (localTemplateManifestPaths.includes(templateId)) {
      return loadLocalTemplateFromResourcePath(resourcePath);
    }

    return this._options.service.getResourceManifest(resourcePath);
  };

  public getWorkflowDefinition = async (templateId: string, workflowId: string): Promise<LogicAppsV2.WorkflowDefinition> => {
    if (localTemplateManifestPaths.includes(templateId)) {
      return loadLocalTemplateFromResourcePath(`${templateId}/${workflowId}`, 'workflow');
    }

    return this._options.service.getWorkflowDefinition(templateId, workflowId);
  };

  public getContentPathUrl = (templatePath: string, resourcePath: string): string => {
    const templateId = templatePath.split('/')[0];

    if (localTemplateManifestPaths.includes(templateId)) {
      return resourcePath;
    }

    return this._options.service.getContentPathUrl(templatePath, resourcePath);
  };

  public isResourceAvailable = async () => {
    return true;
  };
}

class LocalResourceService implements IResourceService {
  async listSubscriptions() {
    return [
      { id: '/subscriptions/one', name: 'one', displayName: 'Subscription 1' },
      { id: '/subscriptions/two', name: 'two', displayName: 'Subscription 2' },
      { id: '/subscriptions/three', name: 'three', displayName: 'Subscription 3' },
    ];
  }

  async listResourceGroups(subscriptionId: string) {
    return subscriptionId === 'two'
      ? []
      : [
          { id: '/1', name: 'FirstRG', displayName: 'FirstRG' },
          { id: '/2', name: 'SecondRG', displayName: 'SecondRG' },
          { id: '/3', name: 'ThirdRG', displayName: 'ThirdRG' },
        ];
  }

  async listLocations() {
    return [
      { id: '/eastus', name: 'eastus', displayName: 'East US' },
      { id: '/westus', name: 'westus', displayName: 'West US' },
    ];
  }

  async listLogicApps() {
    return [
      { id: '/app1', name: 'app1', kind: 'standard' },
      { id: '/app2', name: 'app2', kind: 'standard' },
    ] as any;
  }
}
