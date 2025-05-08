// Helper functions for hybrid logic apps
export const isHybridLogicApp = (uri: string): boolean => {
  return uri.toLowerCase().includes('microsoft.app');
};

export const getHybridAppBaseRelativeUrl = (appId: string | undefined): string => {
  if (!appId) {
    throw new Error(`Invalid value for appId: '${appId}'`);
  }

  if (appId.endsWith('/')) {
    appId = appId.substring(0, appId.length - 1);
  }

  return `${appId}/providers/Microsoft.App/logicApps/${appId.split('/').pop()}`;
};

export const hybridApiVersion = '2024-02-02-preview';
