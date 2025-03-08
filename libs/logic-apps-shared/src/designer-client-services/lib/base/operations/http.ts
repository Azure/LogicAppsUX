export const httpActionOperation = {
  name: 'httpaction',
  id: 'httpaction',
  type: 'Http',
  properties: {
    api: {
      id: 'connectionProviders/http',
      name: 'http',
      brandColor: '#709727',
      description: 'All Http operations',
      displayName: 'HTTP',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/http.svg',
    },
    summary: 'HTTP',
    description: 'Choose a REST API to invoke.',
    visibility: 'Important',
    operationType: 'Http',
    brandColor: '#709727',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/http.svg',
  },
};

export const httpSwaggerActionOperation = {
  name: 'httpswaggeraction',
  id: 'httpswaggeraction',
  type: 'Http',
  properties: {
    api: {
      id: 'connectionProviders/http',
      name: 'http',
      brandColor: '#709727',
      description: 'All Http operations',
      displayName: 'HTTP',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/http.svg',
    },
    capabilities: ['swaggerSelection'],
    summary: 'HTTP + Swagger',
    description: 'Choose a Swagger-enabled API to invoke.',
    visibility: 'Important',
    operationType: 'Http',
    brandColor: '#709727',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/http_swagger.svg',
  },
};

export const httpWebhookActionOperation = {
  name: 'httpwebhookaction',
  id: 'httpwebhookaction',
  type: 'HttpWebhook',
  properties: {
    api: {
      id: 'connectionProviders/http',
      name: 'http',
      brandColor: '#709727',
      description: 'All Http operations',
      displayName: 'HTTP',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/http.svg',
    },
    capabilities: ['Stateful'],
    summary: 'HTTP Webhook',
    description: 'Create a custom HTTP callback to occur when something happens.',
    visibility: 'Important',
    operationType: 'HttpWebhook',
    brandColor: '#709727',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/webhook.svg',
  },
};

export const httpTriggerOperation = {
  name: 'httptrigger',
  id: 'httptrigger',
  type: 'Http',
  properties: {
    api: {
      id: 'connectionProviders/http',
      name: 'http',
      brandColor: '#709727',
      description: 'All Http operations',
      displayName: 'HTTP',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/http.svg',
    },
    capabilities: ['Stateful'],
    summary: 'HTTP',
    description: 'Trigger an event based on a select REST API.',
    visibility: 'Important',
    trigger: 'single',
    operationType: 'Http',
    brandColor: '#709727',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/http.svg',
  },
};

export const httpSwaggerTriggerOperation = {
  name: 'httpswaggertrigger',
  id: 'httpswaggertrigger',
  type: 'Http',
  properties: {
    api: {
      id: 'connectionProviders/http',
      name: 'http',
      brandColor: '#709727',
      description: 'All Http operations',
      displayName: 'HTTP',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/http.svg',
    },
    capabilities: ['swaggerSelection'],
    summary: 'HTTP + Swagger',
    description: 'Trigger an event based on a select Swagger-enabled API.',
    visibility: 'Important',
    trigger: 'single',
    operationType: 'Http',
    brandColor: '#709727',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/http_swagger.svg',
  },
};

export const httpWebhookTriggerOperation = {
  name: 'httpwebhooktrigger',
  id: 'httpwebhooktrigger',
  type: 'HttpWebhook',
  properties: {
    api: {
      id: 'connectionProviders/http',
      name: 'http',
      brandColor: '#709727',
      description: 'All Http operations',
      displayName: 'HTTP',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/http.svg',
    },
    capabilities: ['Stateful'],
    summary: 'HTTP Webhook',
    description: 'Create a custom HTTP callback to trigger an action when something happens.',
    visibility: 'Important',
    trigger: 'single',
    operationType: 'HttpWebhook',
    brandColor: '#709727',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/webhook.svg',
  },
};
