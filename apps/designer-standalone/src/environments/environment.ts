// This file can be replaced during build by using the `fileReplacements` array.
// When building for production, this file is replaced with `environment.prod.ts`.

const getAccessToken = (): string | undefined => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const armTokenData = require('./armToken.json');
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
  armToken: getAccessToken(),
};
