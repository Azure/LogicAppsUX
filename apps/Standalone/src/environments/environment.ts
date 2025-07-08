// This file can be replaced during build by using the `fileReplacements` array.
// When building for production, this file is replaced with `environment.prod.ts`.

const getAccessToken = async (fileName: string): Promise<string | undefined> => {
  try {
    const armTokenData = await import(`./jsonImport/${fileName}.json`);
    if (new Date(armTokenData.expiresOn) <= new Date()) {
      return undefined;
    }
    return armTokenData.accessToken;
  } catch (_e) {
    return undefined;
  }
};

export interface EnvironmentVars {
  production: boolean;
  armToken?: string;
  subscriptionIds?: string[];
  chatbotEndpoint?: string;
}

export const environment: EnvironmentVars = {
  production: false,
};

export const loadToken = async () => {
  const token = await getAccessToken('armToken');
  environment.armToken = token;
  return token ?? null;
};

// place a subscriptionIds.json file in /public
// with the following format:
// {
//   "subscriptionIds": ["subscriptionId1", "subscriptionId2"]
// }

const getSubscriptionIds = async (): Promise<string[] | undefined> => {
  try {
    const res = await fetch('/subscriptionIds.json');
    if (!res.ok) {
      throw new Error('File not found');
    }
    const subData = await res.json();
    return subData?.subscriptionIds;
  } catch (_e) {
    return undefined;
  }
};

export const loadSubscriptionIds = async () => {
  const subs = await getSubscriptionIds();
  environment.subscriptionIds = subs;
  return subs ?? [];
};
