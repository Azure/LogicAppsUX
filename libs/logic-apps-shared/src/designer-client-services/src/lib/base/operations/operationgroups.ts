export const controlGroup = {
  id: 'connectionProviders/control',
  name: 'control',
  properties: {
    brandColor: '#8C3900',
    description: 'Control operations',
    displayName: 'Control',
    capabilities: ['actions'],
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/control.svg',
  },
};

export const dateTimeGroup = {
  id: 'connectionProviders/datetime',
  name: 'datetime',
  properties: {
    brandColor: '#1F85FF',
    description: 'Date Time operations',
    displayName: 'Date Time',
    capabilities: ['actions'],
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/recurrence.svg',
  },
};

export const httpGroup = {
  id: 'connectionProviders/http',
  name: 'http',
  properties: {
    brandColor: '#709727',
    description: 'All Http operations',
    displayName: 'HTTP',
    capabilities: ['actions', 'triggers'],
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/http.svg',
  },
};

export const requestGroup = {
  id: 'connectionProviders/request',
  name: 'request',
  properties: {
    brandColor: '#009DA5',
    description: 'Operations to handle inbound request to workflow and send workflow response',
    displayName: 'Request',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/request.svg',
    capabilities: ['actions', 'triggers'],
  },
};

export const scheduleGroup = {
  id: 'connectionProviders/schedule',
  name: 'schedule',
  properties: {
    brandColor: '#1F85FF',
    description: 'Schedule operations',
    displayName: 'Schedule',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/recurrence.svg',
    capabilities: ['actions', 'triggers'],
  },
};

export const variableGroup = {
  id: 'connectionProviders/variable',
  name: 'variable',
  properties: {
    brandColor: '#770BD6',
    description: 'All variable operations',
    displayName: 'Variables',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/variable.svg',
    capabilities: ['actions'],
  },
};

export const dataOperationsGroup = {
  id: 'connectionProviders/dataOperationNew',
  name: 'dataOperationNew',
  properties: {
    brandColor: '#8c6cff',
    description: 'Data Operations new',
    displayName: 'Data Operations new',
    iconUri: 'https://logicappsv2resources.blob.core.windows.net/icons/compose.svg',
    capabilities: ['actions'],
  },
};
