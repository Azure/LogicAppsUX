

export const AzureConnectorMock= {
  value: [
    {
      properties: {
        name: 'eduframe',
        connectionParameters: {
          token: {
            type: 'oauthSetting',
            oAuthSettings: {
              identityProvider: 'oauth2',
              clientId: 'logic-apps',
              scopes: [],
              redirectMode: 'Global',
              redirectUrl: 'https://global.consent.azure-apim.net/redirect',
              properties: {
                IsFirstParty: 'False',
                //IsOnbehalfofLoginSupported: false,
              },
              customParameters: {
                authorizationUrl: {
                  value: 'https://api.eduframe.nl/login/oauth2/auth',
                },
                tokenUrl: {
                  value: 'https://api.eduframe.nl/login/oauth2/token',
                },
                refreshUrl: {
                  value: 'https://api.eduframe.nl/login/oauth2/token',
                },
              },
            },
          },
        },
        metadata: {
          source: 'marketplace',
          brandColor: '#e4e4e4',
          //useNewApimVersion: true,
        },
        runtimeUrls: ['https://logic-apis-centralus.azure-apim.net/apim/eduframe'],
        generalInformation: {
          iconUrl: 'https://connectoricons-prod.azureedge.net/releases/v1.0.1570/1.0.1570.2764/eduframe/icon.png',
          displayName: 'Eduframe',
          description:
            'Eduframe is a complete solution for commercial training providers & business schools to attract more students, manage & automate the course administration, and deliver the ultimate learning experience. Eduframe seamlessly integrates with Canvas LMS. The connector opens up the opportunity to easily integrate your existing software applications with Eduframe, like your CRM and accounting software.',
          //releaseTag: 'Preview', // danielle can we use this
        //   tier: 'Premium',
        },
        capabilities: ['actions'],
        isExportSupported: false,
      },
      id: '/subscriptions/4201f397-837b-48ea-8943-980767f294ac/providers/Microsoft.Web/locations/centralus/managedApis/eduframe',
      name: 'eduframe',
      type: 'Microsoft.Web/locations/managedApis',
      location: 'centralus',
    },
    {
      properties: {
        name: 'egnyte',
        connectionParameters: {
          token: {
            type: 'oauthSetting',
            oAuthSettings: {
              identityProvider: 'oauth2',
              clientId: 'xx877eb8mujv6dyu23w5v899',
              scopes: [],
              //redirectMode: 'Global',
              redirectUrl: 'https://global.consent.azure-apim.net/redirect',
              properties: {
                IsFirstParty: 'False',
                // IsOnbehalfofLoginSupported: false,
              },
            //   customParameters: {
            //     authorizationUrl: {
            //       value: 'https://us-partner-integrations.egnyte.com/ms-flow/oauth/code',
            //     },
            //     refreshUrl: {
            //       value: 'https://us-partner-integrations.egnyte.com/ms-flow/oauth/token',
            //     },
            //     tokenUrl: {
            //       value: 'https://us-partner-integrations.egnyte.com/ms-flow/oauth/token',
            //     },
            //   },
            },
          },
        },
        metadata: {
          source: 'marketplace',
          brandColor: '#3DBAB4',
         // useNewApimVersion: true,
        },
        runtimeUrls: ['https://logic-apis-centralus.azure-apim.net/apim/egnyte'],
        generalInformation: {
          iconUrl: 'https://connectoricons-prod.azureedge.net/releases/v1.0.1570/1.0.1570.2764/egnyte/icon.png',
          displayName: 'Egnyte',
          description:
            'Egnyte is a service that keeps your files safe, synced, and easy to share. Connect to Egnyte to manage your files. You can perform various actions such as upload, update, get, and delete files in Egnyte.',
          // releaseTag: 'Preview',
        //   tier: 'Premium',
        },
        capabilities: ['actions'],
        isExportSupported: false,
      },
      id: '/subscriptions/4201f397-837b-48ea-8943-980767f294ac/providers/Microsoft.Web/locations/centralus/managedApis/egnyte',
      name: 'egnyte',
      type: 'Microsoft.Web/locations/managedApis',
      location: 'centralus',
    },
    {
      properties: {
        name: 'egoi',
        connectionParameters: {
          api_key: {
            type: 'securestring',
            uiDefinition: {
              displayName: 'API Key',
              description: 'The API Key for this api',
              tooltip: 'Provide your API Key',
              constraints: {
                tabIndex: 2,
                clearText: false,
                required: 'true',
              },
            },
          },
        },
        metadata: {
          source: 'marketplace',
          brandColor: '#00AEDA',
          // useNewApimVersion: true,
        },
        runtimeUrls: ['https://logic-apis-centralus.azure-apim.net/apim/egoi'],
        generalInformation: {
          iconUrl: 'https://connectoricons-prod.azureedge.net/releases/v1.0.1570/1.0.1570.2764/egoi/icon.png',
          displayName: 'E-goi',
          description:
            'E-goi is a Multichannel Marketing Automation Platform, including email marketing services, SMS, Voice Broadcast, Push Notifications, Web Push and Forms to Capture, Automate, Communicate, Analyse and Generate more Sales. The connector allow users to add/update contacts, attach tags and send transactional SMS.',
          // releaseTag: 'Preview',
          // tier: 'Premium',
        },
        capabilities: ['actions'],
        isExportSupported: true,
      },
      id: '/subscriptions/4201f397-837b-48ea-8943-980767f294ac/providers/Microsoft.Web/locations/centralus/managedApis/egoi',
      name: 'egoi',
      type: 'Microsoft.Web/locations/managedApis',
      location: 'centralus',
    },
    {
      properties: {
        name: 'eigenevents',
        connectionParameters: {
          eventsBackendUrl: {
            type: 'string',
            uiDefinition: {
              constraints: { tabIndex: 1, required: 'true' },
              description: 'Specify the Base URL for Eigen Events HTTP Server',
              displayName: 'Eigen Events Server Base URL',
              tooltip: 'Provide a url e.g https://eewh-be.domain.io',
            },
          },
          api_key: {
            type: 'securestring',
            uiDefinition: {
              displayName: 'API Key',
              description: 'The API Key for this api',
              tooltip: 'Provide your API Key',
              constraints: {
                tabIndex: 2,
                clearText: false,
                required: 'true',
              },
            },
          },
        },
        metadata: {
          source: 'marketplace',
          brandColor: '#438955',
          // useNewApimVersion: true,
        },
        runtimeUrls: ['https://logic-apis-centralus.azure-apim.net/apim/eigenevents'],
        generalInformation: {
          iconUrl: 'https://connectoricons-prod.azureedge.net/releases/v1.0.1570/1.0.1570.2764/eigenevents/icon.png',
          displayName: 'Eigen Events',
          description:
            'Provides events from Ingenuity for use as flow triggers. You can use this connector to start flows whenever a selected event completes in the Eigen Ingenuity System',
          // releaseTag: 'Preview',
        //   tier: 'Premium',
        },
        capabilities: ['actions'],
        isExportSupported: true,
      },
      id: '/subscriptions/4201f397-837b-48ea-8943-980767f294ac/providers/Microsoft.Web/locations/centralus/managedApis/eigenevents',
      name: 'eigenevents',
      type: 'Microsoft.Web/locations/managedApis',
      location: 'centralus',
    },
  ],
};
