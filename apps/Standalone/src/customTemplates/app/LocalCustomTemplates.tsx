import { useMemo } from 'react';
import { CustomTemplatesDataProvider } from '@microsoft/logic-apps-designer';
import { TemplatesDesignerProvider } from '@microsoft/logic-apps-designer';
import { useSelector } from 'react-redux';
import {
  BaseGatewayService,
  BaseTenantService,
  StandardConnectionService,
  StandardOperationManifestService,
  ConsumptionConnectionService,
  ResourceIdentityType,
  BaseOAuthService,
  ConsumptionOperationManifestService,
} from '@microsoft/logic-apps-shared';
import { HttpClient } from '../../designer/app/AzureLogicAppsDesigner/Services/HttpClient';
import type { RootState } from '../state/Store';

export const LocalCustomTemplates = () => {
  const { theme } = useSelector((state: RootState) => ({
    theme: state.customTemplateLoader.theme,
  }));

  const isConsumption = false;

  const services = useMemo(
    () => getServices(isConsumption),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isConsumption]
  );

  return (
    <TemplatesDesignerProvider locale="en-US" theme={theme}>
      <CustomTemplatesDataProvider
        resourceDetails={{
          subscriptionId: '',
          resourceGroup: '',
          location: '',
          workflowAppName: '',
        }}
        connectionReferences={{}}
        services={services}
      >
        <div
          style={{
            margin: '20px',
          }}
        >
          {/* TODO: templates designer */}
        </div>
      </CustomTemplatesDataProvider>
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

  return {
    connectionService,
    gatewayService,
    tenantService,
    oAuthService,
    operationManifestService,
    workflowService,
  };
};
