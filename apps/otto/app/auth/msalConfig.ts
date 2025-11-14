// This module should only be imported on the client side
if (typeof window === 'undefined') {
  throw new Error('msalConfig should only be imported on the client side');
}

const { LogLevel } = await import('@azure/msal-browser');
const { env } = await import('../env.client');

/**
 * MSAL configuration for Azure Entra ID authentication
 */
export const msalConfig = {
  auth: {
    clientId: env.VITE_ENTRA_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${env.VITE_ENTRA_TENANT_ID}`,
    redirectUri: env.VITE_ENTRA_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage', // Use localStorage for better persistence
    storeAuthStateInCookie: false, // Set to true for IE11 or Edge support
  },
  system: {
    loggerOptions: {
      loggerCallback: (level: any, message: string, containsPii: boolean) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error: {
            console.error(message);
            return;
          }
          case LogLevel.Info: {
            console.info(message);
            return;
          }
          case LogLevel.Verbose: {
            console.debug(message);
            return;
          }
          case LogLevel.Warning: {
            console.warn(message);
            return;
          }
        }
      },
      logLevel: import.meta.env.DEV ? LogLevel.Verbose : LogLevel.Error,
    },
  },
};

/**
 * Scopes for login request
 */
export const loginRequest = {
  scopes: ['User.Read'], // Basic Microsoft Graph API scope
};
