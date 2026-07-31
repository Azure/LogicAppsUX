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
  foundryToken?: string;
  subscriptionIds?: string[];
  chatbotEndpoint?: string;
}

export const environment: EnvironmentVars = {
  production: false,
};

/** Matches `ARM_TOKEN_DEV_ENDPOINT` in `vite-plugins/armTokenDevServer.ts`. */
const DEV_TOKEN_ENDPOINT = '/__dev/armToken';
/** Renew this long before the token actually expires. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const MIN_REFRESH_DELAY_MS = 30 * 1000;
const MAX_REFRESH_DELAY_MS = 30 * 60 * 1000;

interface DevToken {
  accessToken?: string;
  expiresOn?: string;
}

let refreshTimer: ReturnType<typeof setTimeout> | undefined;

const getDevServerTokens = async (): Promise<{ arm?: DevToken; foundry?: DevToken } | undefined> => {
  if (!import.meta.env.DEV) {
    return undefined;
  }
  try {
    const response = await fetch(DEV_TOKEN_ENDPOINT, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      return undefined;
    }
    return await response.json();
  } catch (_e) {
    return undefined;
  }
};

const scheduleTokenRefresh = (expiresOn: string | undefined) => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }
  const expiry = expiresOn ? new Date(expiresOn).getTime() : Number.NaN;
  const untilRefresh = Number.isNaN(expiry) ? MAX_REFRESH_DELAY_MS : expiry - Date.now() - REFRESH_MARGIN_MS;
  const delay = Math.min(Math.max(untilRefresh, MIN_REFRESH_DELAY_MS), MAX_REFRESH_DELAY_MS);
  refreshTimer = setTimeout(() => {
    loadToken();
  }, delay);
};

export const loadToken = async () => {
  const devTokens = await getDevServerTokens();

  if (devTokens?.arm?.accessToken) {
    environment.armToken = devTokens.arm.accessToken;
    environment.foundryToken = devTokens.foundry?.accessToken;
    scheduleTokenRefresh(devTokens.arm.expiresOn);
    return environment.armToken;
  }

  environment.armToken = await getAccessToken('armToken');
  environment.foundryToken = await getAccessToken('foundryToken');

  if (import.meta.env.DEV) {
    // The dev server could not mint a token (for example `az login` expired) — retry later.
    scheduleTokenRefresh(undefined);
  }

  return environment.armToken ?? null;
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
