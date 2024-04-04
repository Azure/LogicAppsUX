// This file can be replaced during build by using the `fileReplacements` array.
// When building for production, this file is replaced with `environment.prod.ts`.

const getAccessToken = async (fileName: string): Promise<string | undefined> => {
  try {
    const armTokenData = await import(`./jsonImport/${fileName}.json`);
    if (new Date(armTokenData.expiresOn) <= new Date()) {
      return undefined;
    }
    return armTokenData.accessToken;
  } catch (e) {
    return undefined;
  }
};

export interface EnvironmentVars {
  production: boolean;
  armToken?: string;
  chatbotEndpoint?: string;
}

export const environment: EnvironmentVars = {
  production: false,
};

export const loadToken = async () => {
  const token = await getAccessToken('armToken');
  environment.armToken = token;
  return token;
};
