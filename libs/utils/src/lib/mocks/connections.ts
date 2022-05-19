import type { Connection } from '../models/connection';

export const connectionsMock: Connection[] = [
  {
    kind: 'V2',
    properties: {
      displayName: '5',
      // authenticatedUser: {},  received but not used
      overallStatus: 'Connected',
      statuses: [{ status: 'Connected' }],
      // parameterValues: {}, received but not used
      // customParameterValues: {}, received but not used
      createdTime: '2022-03-21T19:27:17.1375273Z',
      // changedTime: '2022-03-21T19:27:17.1842602Z', received but not used
      api: {
        name: 'accuweatherip',
        displayName: 'AccuWeather (Independent Publisher)',
        description: 'AccuWeather provides commercial weather forecasting services worldwide.',
        iconUri: 'https://connectoricons-prod.azureedge.net/releases/v1.0.1547/1.0.1547.2676/accuweatherip/icon.png',
        brandColor: '#da3b01',
        category: 'Standard',
        id: '/subscriptions/f34b22a3-2202-4fb1-b040-1332bd928c84/providers/Microsoft.Web/locations/westus/managedApis/accuweatherip',
        type: 'Microsoft.Web/locations/managedApis',
      },
      testLinks: [],
      // testRequests: [], received but not used
      //connectionRuntimeUrl:
      //  'https://a9ab15f5a12185bf.07.common.logic-westus.azure-apihub.net/apim/accuweatherip/d6fef326e77a4f74a34345af6d618e30', received but not used
    },
    id: '/subscriptions/f34b22a3-2202-4fb1-b040-1332bd928c84/resourceGroups/dacogbur/providers/Microsoft.Web/connections/accuweatherip',
    name: 'accuweatherip',
    type: 'Microsoft.Web/connections',
    location: 'westus',
  },
  {
    kind: 'V2',
    properties: {
      displayName: '4',
      overallStatus: 'Connected',
      statuses: [{ status: 'Connected' }],
      createdTime: '2022-02-28T23:44:55.4474753Z',
      api: {
        name: 'bingmaps',
        displayName: 'Bing Maps',
        description: 'Bing Maps',
        iconUri: 'https://connectoricons-prod.azureedge.net/releases/v1.0.1567/1.0.1567.2748/bingmaps/icon.png',
        brandColor: '#008372',
        category: 'Standard',
        id: '/subscriptions/f34b22a3-2202-4fb1-b040-1332bd928c84/providers/Microsoft.Web/locations/westus/managedApis/bingmaps',
        type: 'Microsoft.Web/locations/managedApis',
      },
      testLinks: [],
    },
    id: '/subscriptions/f34b22a3-2202-4fb1-b040-1332bd928c84/resourceGroups/dacogbur/providers/Microsoft.Web/connections/bingmaps',
    name: 'bingmaps',
    type: 'Microsoft.Web/connections',
    location: 'westus',
  },
  {
    kind: 'V2',
    properties: {
      displayName: 'Carbon Intensity (Independent Publisher)',
      overallStatus: 'Connected',
      statuses: [{ status: 'Connected' }],
      createdTime: '2022-03-01T23:04:12.4499514Z',
      api: {
        name: 'carbonintensityip',
        displayName: 'Carbon Intensity (Independent Publisher)',
        description:
          'Uses Carbon Intensity API to provide an indicative trend of the regional carbon intensity of the electricity system in Great Britain',
        iconUri: 'https://connectoricons-prod.azureedge.net/releases/v1.0.1559/1.0.1559.2723/carbonintensityip/icon.png',
        brandColor: '#da3b01',
        category: 'Standard',
        id: '/subscriptions/f34b22a3-2202-4fb1-b040-1332bd928c84/providers/Microsoft.Web/locations/westus/managedApis/carbonintensityip',
        type: 'Microsoft.Web/locations/managedApis',
      },
      testLinks: [],
    },
    id: '/subscriptions/f34b22a3-2202-4fb1-b040-1332bd928c84/resourceGroups/dacogbur/providers/Microsoft.Web/connections/carbonintensityip',
    name: 'carbonintensityip',
    type: 'Microsoft.Web/connections',
    location: 'westus',
  },
  {
    kind: 'V2',
    properties: {
      displayName: '3',
      overallStatus: 'Connected',
      statuses: [{ status: 'Connected' }],
      createdTime: '2022-03-01T23:07:44.2785334Z',
      api: {
        name: 'clicksendpostcards',
        displayName: 'ClickSend Postcards',
        description:
          'ClickSend Postcard is a cloud-based service enabling you to easily send beautiful colour postcards for any occasion to anyone, anywhere at any scale in an instant.',
        iconUri: 'https://connectoricons-prod.azureedge.net/releases/v1.0.1563/1.0.1563.2732/clicksendpostcards/icon.png',
        brandColor: '#F236A9',
        category: 'Standard',
        id: '/subscriptions/f34b22a3-2202-4fb1-b040-1332bd928c84/providers/Microsoft.Web/locations/westus/managedApis/clicksendpostcards',
        type: 'Microsoft.Web/locations/managedApis',
      },
      testLinks: [],
    },
    id: '/subscriptions/f34b22a3-2202-4fb1-b040-1332bd928c84/resourceGroups/dacogbur/providers/Microsoft.Web/connections/clicksendpostcards',
    name: 'clicksendpostcards',
    type: 'Microsoft.Web/connections',
    location: 'westus',
  },
  {
    kind: 'V2',
    properties: {
      displayName: 'dacogbur@microsoft.com',
      //authenticatedUser: { name: 'dacogbur@microsoft.com' },
      overallStatus: 'Connected',
      statuses: [{ status: 'Connected' }],
      // parameterValues: {
      //   'token:TenantId': '72f988bf-86f1-41af-91ab-2d7cd011db47',
      //   'token:grantType': 'code',
      // },
      // customParameterValues: {},
      createdTime: '2022-02-28T23:02:18.6684645Z',
      // changedTime: '2022-05-17T14:49:53.1402656Z',
      api: {
        name: 'kusto',
        displayName: 'Azure Data Explorer',
        description:
          'Azure Data Explorer a.k.a Kusto is a log analytics cloud platform optimized for ad-hoc big data queries. Read more about it here: http://aka.ms/kdocs',
        iconUri: 'https://connectoricons-prod.azureedge.net/releases/v1.0.1578/1.0.1578.2813/kusto/icon.png',
        brandColor: '#20427f',
        category: 'Standard',
        id: '/subscriptions/f34b22a3-2202-4fb1-b040-1332bd928c84/providers/Microsoft.Web/locations/westus/managedApis/kusto',
        type: 'Microsoft.Web/locations/managedApis',
      },
      testLinks: [],
    },
    id: '/subscriptions/f34b22a3-2202-4fb1-b040-1332bd928c84/resourceGroups/dacogbur/providers/Microsoft.Web/connections/kusto',
    name: 'kusto',
    type: 'Microsoft.Web/connections',
    location: 'westus',
  },
  {
    kind: 'V2',
    properties: {
      displayName: 'dacogbur@microsoft.com',
      overallStatus: 'Connected',
      statuses: [{ status: 'Connected' }],
      createdTime: '2022-02-24T21:34:58.7465397Z',
      api: {
        name: 'visualstudioteamservices',
        displayName: 'Azure DevOps',
        description:
          "Azure DevOps provides services for teams to share code, track work, and ship software - for any language, all in a single package. It's the perfect complement to your IDE.",
        iconUri: 'https://connectoricons-prod.azureedge.net/releases/v1.0.1573/1.0.1573.2770/vsts/icon.png',
        brandColor: '#0078d7',
        category: 'Standard',
        id: '/subscriptions/f34b22a3-2202-4fb1-b040-1332bd928c84/providers/Microsoft.Web/locations/westus/managedApis/visualstudioteamservices',
        type: 'Microsoft.Web/locations/managedApis',
      },
      testLinks: [
        {
          requestUri:
            'https://management.azure.com:443/subscriptions/f34b22a3-2202-4fb1-b040-1332bd928c84/resourceGroups/dacogbur/providers/Microsoft.Web/connections/visualstudioteamservices/extensions/proxy/_apis/Accounts?api-version=2018-07-01-preview',
          method: 'get',
        },
      ],
      // testRequests: [
      //   {
      //     body: {
      //       request: { method: 'get', path: '_apis/Accounts' },
      //     },
      //     requestUri:
      //       'https://management.azure.com:443/subscriptions/f34b22a3-2202-4fb1-b040-1332bd928c84/resourceGroups/dacogbur/providers/Microsoft.Web/connections/visualstudioteamservices/dynamicInvoke?api-version=2018-07-01-preview',
      //     method: 'POST',
      //   },
      // ],
    },
    id: '/subscriptions/f34b22a3-2202-4fb1-b040-1332bd928c84/resourceGroups/dacogbur/providers/Microsoft.Web/connections/visualstudioteamservices',
    name: 'visualstudioteamservices',
    type: 'Microsoft.Web/connections',
    location: 'westus',
  },
];
