export const updateAuthSettings = async (siteResourceId: string, options: string[]) => {
  // Placeholder for actual implementation
  console.log(`Updating auth settings for site: ${siteResourceId} with options: ${options}`);
};

export const generateKeys = async (siteResourceId: string, duration: string, accessKey: string) => {
  // Placeholder for actual implementation
  console.log(`Generating keys for site: ${siteResourceId} with duration: ${duration} and accessKey: ${accessKey}`);
  return {
    key: `new-generated-key-${Date.now()}`,
    generatedTime: new Date().toISOString(),
    expiresTime: new Date(Date.now() + Number.parseInt(duration) * 60000).toISOString(),
  };
};
