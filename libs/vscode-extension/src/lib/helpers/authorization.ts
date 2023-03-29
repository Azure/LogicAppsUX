export const getBaseGraphApi = (cloudHost: string | undefined): string => {
  if (!cloudHost) {
    return 'https://management.azure.com';
  } else if (cloudHost.endsWith('.usgovcloudapi.net')) {
    return 'https://management.usgovcloudapi.net';
  } else if (cloudHost.endsWith('.windows.net')) {
    return 'https://management.azure.com';
  } else if (cloudHost.endsWith('.chinacloudapi.cn')) {
    return 'https://management.chinacloudapi.cn';
  } else if (cloudHost.endsWith('.eaglex.ic.gov')) {
    return 'https://management.azure.eaglex.ic.gov';
  } else if (cloudHost.endsWith('.microsoft.scloud')) {
    return 'https://management.azure.microsoft.scloud';
  } else {
    return 'https://management.azure.com';
  }
};
