export const requestOperation = {
  name: 'request',
  id: 'request',
  type: 'Request',
  kind: 'Http',
  properties: {
    api: {
      id: 'connectionProviders/request',
      name: 'request',
      brandColor: '#009DA5',
      description: 'Operations to handle inbound request to workflow and send workflow response',
      displayName: 'Request',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/request.svg',
    },
    summary: 'When a HTTP request is received',
    description: 'This is an incoming API call that could use actions in a Logic App or other API to trigger this flow.',
    visibility: 'Important',
    operationType: 'Request',
    operationKind: 'Http',
    trigger: 'single',
    brandColor: '#009DA5',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/request.svg',
  },
};

export const a2aRequestOperation = {
  name: 'a2arequest',
  id: 'a2arequest',
  type: 'Request',
  kind: 'Agent',
  properties: {
    api: {
      id: 'connectionProviders/a2a',
      name: 'a2arequest',
      brandColor: '#009DA5',
      description: 'Operations to handle inbound request to workflow and send workflow response',
      displayName: 'a2arequest',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/request.svg',
    },
    summary: 'A2A Request',
    description: 'This is an incoming API call that could use actions in a Logic App or other API to trigger this flow.',
    visibility: 'Important',
    operationType: 'Request',
    operationKind: 'Agent',
    trigger: 'single',
    brandColor: '#009DA5',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/request.svg',
  },
};

export const responseOperation = {
  name: 'response',
  id: 'response',
  type: 'Response',
  kind: 'Http',
  properties: {
    api: {
      id: 'connectionProviders/request',
      name: 'request',
      brandColor: '#009DA5',
      description: 'Operations to handle inbound request to workflow and send workflow response',
      displayName: 'Request',
      iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/request.svg',
    },
    summary: 'Response',
    description: 'This is an incoming API call that could use the results of an action to trigger this flow.',
    visibility: 'Important',
    operationType: 'Response',
    operationKind: 'Http',
    brandColor: '#009DA5',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/request.svg',
  },
};
