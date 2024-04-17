export const getBaseGraphApi = (cloudHost: string | undefined): string => {
  if (!cloudHost) {
    return 'https://management.azure.com';
  }
  if (cloudHost.endsWith('.usgovcloudapi.net')) {
    return 'https://management.usgovcloudapi.net';
  }
  if (cloudHost.endsWith('.windows.net')) {
    return 'https://management.azure.com';
  }
  if (cloudHost.endsWith('.chinacloudapi.cn')) {
    return 'https://management.chinacloudapi.cn';
  }
  if (cloudHost.endsWith('.eaglex.ic.gov')) {
    return 'https://management.azure.eaglex.ic.gov';
  }
  if (cloudHost.endsWith('.microsoft.scloud')) {
    return 'https://management.azure.microsoft.scloud';
  }
  return 'https://management.azure.com';
};
