import { ConnectionParameter, ConnectionParameterSets } from '@microsoft/logic-apps-shared';

export const mockConnectionParameters: Record<string, ConnectionParameter> = {
  parameterA: {
    type: 'string',
  },
  hiddenParameterB: {
    type: 'string',
    uiDefinition: {
      constraints: {
        hidden: 'true',
      },
    },
  },
  hideInUIParameterC: {
    type: 'string',
    uiDefinition: {
      constraints: {
        hideInUI: 'true',
      },
    },
  },
  parameterD: {
    type: 'string',
  },
};

export const mockConnectionParameterSets: ConnectionParameterSets = {
  uiDefinition: {
    description: '',
    displayName: '',
  },
  values: [
    {
      name: 'parameterSetA',
      uiDefinition: {
        description: '',
        displayName: 'first parameter set',
      },
      parameters: {
        parameterA: {
          type: 'string',
          uiDefinition: {
            description: '',
            displayName: '',
          },
        },
        hiddenParameterB: {
          type: 'string',
          uiDefinition: {
            description: '',
            displayName: '',
            constraints: {
              hidden: 'true',
            },
          },
        },
        hideInUIParameterC: {
          type: 'string',
          uiDefinition: {
            description: '',
            displayName: '',
            constraints: {
              hideInUI: 'true',
            },
          },
        },
        parameterD: {
          type: 'string',
          uiDefinition: {
            description: '',
            displayName: '',
          },
        },
      },
    },
    {
      name: 'parameterSetB',
      uiDefinition: {
        description: '',
        displayName: 'second parameter set',
      },
      parameters: {
        parameterE: {
          type: 'string',
          uiDefinition: {
            description: '',
            displayName: '',
          },
        },
      },
    },
  ],
};

export const mockOauthWithTenantParameters: Record<string, ConnectionParameter> = {
  token: {
    type: 'oauthSetting',
    oAuthSettings: {
      identityProvider: 'aadcertificate',
      clientId: '7ab7862c-4c57-491e-8a45-d52a7e023983',
      scopes: [],
      redirectUrl: 'https://global.consent.azure-apim.net/redirect/azureeventgrid',
      properties: {
        IsFirstParty: 'True',
        AzureActiveDirectoryResourceId: 'https://management.core.windows.net/',
      },
      customParameters: {
        tenantId: {},
      },
    },
  },
  'token:clientId': {
    type: 'string',
    uiDefinition: {
      displayName: 'Client ID',
      description: 'Client (or Application) ID of the Microsoft Entra ID application.',
      constraints: {
        required: 'false',
        hidden: 'true',
      },
    },
  },
  'token:clientSecret': {
    type: 'securestring',
    uiDefinition: {
      displayName: 'Client Secret',
      description: 'Client secret of the Microsoft Entra ID application.',
      constraints: {
        required: 'false',
        hidden: 'true',
      },
    },
  },
  'token:TenantId': {
    type: 'string',
    uiDefinition: {
      displayName: 'Tenant',
      description: 'The tenant ID of for the Microsoft Entra ID application.',
      constraints: {
        required: 'false',
        hidden: 'true',
      },
    },
  },
  'token:resourceUri': {
    type: 'string',
    uiDefinition: {
      displayName: 'ResourceUri',
      description: 'The resource you are requesting authorization to use.',
      constraints: {
        required: 'false',
        hidden: 'true',
      },
    },
  },
  'token:grantType': {
    type: 'string',
    uiDefinition: {
      displayName: 'Grant Type',
      description: 'Grant type',
      constraints: {
        required: 'false',
        hidden: 'true',
        allowedValues: [
          {
            text: 'Code',
            value: 'code',
          },
          {
            text: 'Client Credentials',
            value: 'client_credentials',
          },
        ],
      },
    },
  },
};

export const mockParameterSetsWithCredentialMapping: ConnectionParameterSets = {
  uiDefinition: {
    description: '',
    displayName: '',
  },
  values: [
    {
      name: 'parameterSetA',
      uiDefinition: {
        description: '',
        displayName: 'first parameter set',
      },
      parameters: {
        parameterA: {
          type: 'string',
          uiDefinition: {
            description: '',
            displayName: '',
            credentialMapping: {
              mappingName: 'myCredentialMapping',
              values: [
                {
                  credentialKeyName: 'myCredentialPasswordKey',
                  type: 'UserPassword',
                  typeEnumValue: 1,
                },
              ],
            },
          },
        },
        parameterB: {
          type: 'string',
          uiDefinition: {
            description: '',
            displayName: '',
            credentialMapping: {
              mappingName: 'myCredentialMapping',
              values: [
                {
                  credentialKeyName: 'myCredentialUserKey',
                  type: 'UserPassword',
                  typeEnumValue: 1,
                },
              ],
            },
          },
        },
        hiddenParameterC: {
          type: 'string',
          uiDefinition: {
            description: '',
            displayName: '',
            constraints: {
              hideInUI: 'true',
            },
          },
        },
        parameterD: {
          type: 'string',
          uiDefinition: {
            description: '',
            displayName: '',
          },
        },
      },
    },
    {
      name: 'parameterSetB',
      uiDefinition: {
        description: '',
        displayName: 'second parameter set',
      },
      parameters: {
        parameterE: {
          type: 'string',
          uiDefinition: {
            description: '',
            displayName: '',
            credentialMapping: {
              mappingName: 'myOtherCredentialMapping',
              values: [
                {
                  credentialKeyName: 'myCredentialPasswordKey',
                  type: 'UserPassword',
                  typeEnumValue: 1,
                },
              ],
            },
          },
        },
        parameterF: {
          type: 'string',
          uiDefinition: {
            description: '',
            displayName: '',
            credentialMapping: {
              mappingName: 'myOtherCredentialMapping',
              values: [
                {
                  credentialKeyName: 'myCredentialPasswordKey',
                  type: 'UserPassword',
                  typeEnumValue: 1,
                },
              ],
            },
          },
        },
      },
    },
  ],
};

export const mockParameterSetWithSPAuth: ConnectionParameterSets = {
  uiDefinition: {
    description: '',
    displayName: 'SP Auth',
  },
  values: [
    {
      name: 'SPAuth',
      uiDefinition: {
        displayName: 'Oauth',
        description: 'Oauth',
      },
      parameters: {
        token: {
          type: 'oauthSetting',
          oAuthSettings: {
            identityProvider: '',
            scopes: [],
            clientId: '',
            redirectUrl: '',
            properties: {
              IsFirstParty: 'true',
            },
          },
          uiDefinition: {
            displayName: '',
            description: '',
          },
        },
        environment: {
          type: 'string',
          uiDefinition: {
            displayName: 'Environment id',
            description: '',
            constraints: {
              required: 'false',
              hidden: 'true',
            },
          },
        },
        'token:clientId': {
          type: 'string',
          uiDefinition: {
            displayName: 'Client ID',
            description: '',
            constraints: {
              required: 'false',
              hidden: 'true',
            },
          },
        },
        'token:clientSecret': {
          type: 'securestring',
          uiDefinition: {
            displayName: 'Client Secret',
            description: '',
            constraints: {
              required: 'false',
              hidden: 'true',
            },
          },
        },
        'token:TenantId': {
          type: 'string',
          uiDefinition: {
            displayName: 'Tenant',
            description: '',
            constraints: {
              required: 'false',
              hidden: 'true',
            },
          },
        },
        'token:resourceUri': {
          type: 'string',
          uiDefinition: {
            displayName: 'ResourceUri',
            description: '',
            constraints: {
              required: 'false',
              hidden: 'true',
            },
          },
        },
        'token:grantType': {
          type: 'string',
          uiDefinition: {
            displayName: 'Grant Type',
            description: '',
            constraints: {
              required: 'false',
              hidden: 'true',
              allowedValues: [
                {
                  text: 'Code',
                  value: 'code',
                },
                {
                  text: 'Client Credentials',
                  value: 'client_credentials',
                },
              ],
            },
          },
        },
      },
    },
  ],
};

export const mockParameterSetWithOAuth: ConnectionParameterSets = {
  uiDefinition: {
    description: '',
    displayName: 'OAuth',
  },
  values: [
    {
      name: 'OAuth',
      uiDefinition: {
        displayName: 'OAuth',
        description: '',
      },
      parameters: {
        token: {
          type: 'oauthSetting',
          oAuthSettings: {
            identityProvider: '',
            clientId: '',
            scopes: [],
            redirectUrl: '',
            properties: {
              IsFirstParty: 'true',
            },
          },
          uiDefinition: {
            displayName: '',
            description: '',
          },
        },
        environment: {
          type: 'string',
          uiDefinition: {
            displayName: 'Environment id',
            description: '',
            constraints: {
              required: 'false',
              hidden: 'true',
            },
          },
        },
        'token:clientId': {
          type: 'string',
          uiDefinition: {
            displayName: 'Client ID',
            description: '',
            constraints: {
              required: 'true',
              hidden: 'false',
            },
          },
        },
        'token:clientSecret': {
          type: 'securestring',
          uiDefinition: {
            displayName: 'Client Secret',
            description: '',
            constraints: {
              required: 'true',
              hidden: 'false',
            },
          },
        },
        'token:TenantId': {
          type: 'string',
          uiDefinition: {
            displayName: 'Tenant',
            description: '',
            constraints: {
              required: 'true',
              hidden: 'false',
            },
          },
        },
      },
    },
  ],
};

export const mockParameterSetWithClientCertAuth: ConnectionParameterSets = {
  uiDefinition: {
    description: '',
    displayName: 'Client Cert Auth',
  },
  values: [
    {
      name: 'CertOauth',
      uiDefinition: {
        displayName: 'Client Certificate Auth',
        description: '',
      },
      parameters: {
        token: {
          type: 'oauthSetting',
          oAuthSettings: {
            identityProvider: 'DynamicsCrmOnlineCertificateClientCredentials',
            scopes: [],
            clientId: '',
            redirectUrl: '',
            properties: {
              IsFirstParty: 'true',
            },
          },
          uiDefinition: {
            displayName: 'Client Certificate Auth',
            description: '',
            constraints: {
              hidden: 'false',
            },
          },
        },
        environment: {
          type: 'string',
          uiDefinition: {
            displayName: 'Environment id',
            description: 'Environment id',
            tooltip: 'Environment id',
            constraints: {
              required: 'false',
              hidden: 'true',
            },
          },
        },
        'token:tenantId': {
          type: 'string',
          uiDefinition: {
            displayName: 'Tenant',
            description: '',
            constraints: {
              required: 'true',
              hidden: 'false',
            },
          },
        },
        'token:clientId': {
          type: 'string',
          uiDefinition: {
            displayName: 'Client ID',
            description: '',
            constraints: {
              required: 'true',
              hidden: 'false',
            },
          },
        },
        'token:clientCertificateSecret': {
          type: 'clientCertificate',
          uiDefinition: {
            displayName: 'Client certificate secret',
            description: '',
            constraints: {
              required: 'true',
              hidden: 'false',
            },
          },
        },
      },
    },
  ],
};
