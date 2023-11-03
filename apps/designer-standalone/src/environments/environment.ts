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
  chatbotEndpoint:
    'https://brazilus.management.azure.com/subscriptions/80d4fe69-c95b-4dd2-a938-9250f1c8ab03/providers/Microsoft.Logic/locations/eastus2euap/generateCopilotResponse?api-version=2022-09-01-preview',
};
