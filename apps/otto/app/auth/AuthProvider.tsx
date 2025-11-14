import { useState, useEffect, type ReactNode } from 'react';

// These will be loaded dynamically on the client
let makeStyles: any;
let shorthands: any;
let tokens: any;

if (typeof window !== 'undefined') {
  const fluentUI = await import('@fluentui/react-components');
  makeStyles = fluentUI.makeStyles;
  shorthands = fluentUI.shorthands;
  tokens = fluentUI.tokens;
}

// Lazy imports for MSAL - only loaded on client side
let MsalProvider: any;
let useMsal: any;
let useIsAuthenticated: any;
let PublicClientApplication: any;
let EventType: any;
let msalInstance: any;

// Initialize MSAL only on the client side
if (typeof window !== 'undefined') {
  const msalReact = await import('@azure/msal-react');
  const msalBrowser = await import('@azure/msal-browser');
  const { msalConfig } = await import('./msalConfig');

  MsalProvider = msalReact.MsalProvider;
  useMsal = msalReact.useMsal;
  useIsAuthenticated = msalReact.useIsAuthenticated;
  PublicClientApplication = msalBrowser.PublicClientApplication;
  EventType = msalBrowser.EventType;

  // Create MSAL instance
  msalInstance = new PublicClientApplication(msalConfig);

  // Initialize and handle redirect promise
  await msalInstance.initialize();

  // Handle redirect response from login
  msalInstance
    .handleRedirectPromise()
    .then((response: any) => {
      if (response) {
        // Set the active account after successful login
        msalInstance.setActiveAccount(response.account);
      } else {
        // Check if there's an existing account
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length > 0) {
          msalInstance.setActiveAccount(accounts[0]);
        }
      }
    })
    .catch((error: any) => {
      console.error('Error handling redirect:', error);
    });

  // Handle the redirect flows
  msalInstance.addEventCallback((event: any) => {
    if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
      const payload = event.payload;
      const account = payload.account;
      msalInstance.setActiveAccount(account);
    }
  });
}

type AuthProviderProps = {
  children: ReactNode;
};

/**
 * Auth provider wrapper that handles MSAL initialization and authentication
 * Only renders on the client side
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render on the server
  if (!isClient || !MsalProvider || !msalInstance) {
    return <>{children}</>;
  }

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}

/**
 * Component that enforces authentication - redirects to login if not authenticated
 * Only enforces on the client side
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // On server or before client-side hydration, just render children
  if (!isClient || !useMsal || !useIsAuthenticated) {
    return <>{children}</>;
  }

  return <RequireAuthClient>{children}</RequireAuthClient>;
}

const createLoadingStyles = () => {
  if (!makeStyles) {
    return () => ({});
  }

  return makeStyles({
    container: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
    },
    content: {
      textAlign: 'center',
    },
    spinner: {
      width: '48px',
      height: '48px',
      ...shorthands.borderWidth('2px'),
      ...shorthands.borderStyle('solid'),
      ...shorthands.borderColor('transparent', 'transparent', tokens.colorBrandBackground, 'transparent'),
      ...shorthands.borderRadius(tokens.borderRadiusCircular),
      marginLeft: 'auto',
      marginRight: 'auto',
      marginBottom: tokens.spacingVerticalL,
      animationName: {
        from: { transform: 'rotate(0deg)' },
        to: { transform: 'rotate(360deg)' },
      },
      animationDuration: '1s',
      animationIterationCount: 'infinite',
      animationTimingFunction: 'linear',
    },
    text: {
      color: tokens.colorNeutralForeground2,
    },
  });
};

const useLoadingStyles = createLoadingStyles();

const createLoginPageStyles = () => {
  if (!makeStyles) {
    return () => ({});
  }

  return makeStyles({
    container: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundImage: `linear-gradient(135deg, ${tokens.colorBrandBackground2}, ${tokens.colorNeutralBackground1})`,
    },
    wrapper: {
      maxWidth: '448px',
      width: '100%',
      marginLeft: tokens.spacingHorizontalL,
      marginRight: tokens.spacingHorizontalL,
    },
    card: {
      backgroundColor: tokens.colorNeutralBackground1,
      boxShadow: tokens.shadow64,
      ...shorthands.borderRadius(tokens.borderRadiusLarge),
      ...shorthands.padding(tokens.spacingVerticalXXXL),
    },
    header: {
      textAlign: 'center',
      marginBottom: tokens.spacingVerticalXXL,
    },
    title: {
      fontSize: tokens.fontSizeHero800,
      fontWeight: tokens.fontWeightBold,
      color: tokens.colorNeutralForeground1,
      marginBottom: tokens.spacingVerticalS,
    },
    subtitle: {
      color: tokens.colorNeutralForeground2,
    },
    button: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: tokens.spacingHorizontalM,
      ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
      backgroundColor: tokens.colorBrandBackground,
      color: tokens.colorNeutralForegroundOnBrand,
      fontWeight: tokens.fontWeightSemibold,
      ...shorthands.borderRadius(tokens.borderRadiusMedium),
      ...shorthands.border('none'),
      cursor: 'pointer',
      transitionProperty: 'background-color',
      transitionDuration: tokens.durationNormal,
      ':hover': {
        backgroundColor: tokens.colorBrandBackgroundHover,
      },
      ':focus': {
        outlineStyle: 'solid',
        outlineWidth: '2px',
        outlineColor: tokens.colorBrandBackground,
        outlineOffset: '2px',
      },
    },
    icon: {
      width: '20px',
      height: '20px',
      fill: 'currentColor',
    },
    footer: {
      fontSize: tokens.fontSizeBase200,
      color: tokens.colorNeutralForeground3,
      textAlign: 'center',
      marginTop: tokens.spacingVerticalXL,
    },
  });
};

const useLoginPageStyles = createLoginPageStyles();

function RequireAuthClient({ children }: { children: ReactNode }) {
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [isLoading, setIsLoading] = useState(true);
  const loadingStyles = useLoadingStyles();
  const loginStyles = useLoginPageStyles();

  useEffect(() => {
    const checkAuth = async () => {
      // Give MSAL time to process any redirect response
      await new Promise((resolve) => setTimeout(resolve, 500));

      const accounts = instance.getAllAccounts();

      // Account exists, make sure it's set as active
      if (accounts.length > 0 && !instance.getActiveAccount()) {
        instance.setActiveAccount(accounts[0]);
      }

      setIsLoading(false);
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount - instance is stable

  const handleLogin = async () => {
    const { loginRequest } = await import('./msalConfig');
    instance.loginRedirect(loginRequest).catch((error: any) => {
      console.error('Login redirect failed:', error);
    });
  };

  // Show loading while checking auth state
  if (isLoading) {
    return (
      <div className={loadingStyles.container}>
        <div className={loadingStyles.content}>
          <div className={loadingStyles.spinner} />
          <p className={loadingStyles.text}>Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <div className={loginStyles.container}>
        <div className={loginStyles.wrapper}>
          <div className={loginStyles.card}>
            <div className={loginStyles.header}>
              <h1 className={loginStyles.title}>Welcome to Otto</h1>
              <p className={loginStyles.subtitle}>Please sign in to continue</p>
            </div>

            <button onClick={handleLogin} className={loginStyles.button} type="button">
              <svg className={loginStyles.icon} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
              </svg>
              Sign in with Microsoft
            </button>

            <p className={loginStyles.footer}>By signing in, you agree to our terms of service and privacy policy</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook to get the current user's account information
 * Only works on the client side when used inside AuthProvider
 *
 * Note: This hook requires being used inside a component that's wrapped with AuthProvider
 * For most cases, use the UserProfile component directly which handles auth internally
 */
export function useAuth() {
  // Return placeholder values - actual implementation should use MSAL hooks directly
  // when inside an AuthProvider context
  return {
    isAuthenticated: false,
    account: null,
    logout: async () => {
      if (typeof window !== 'undefined' && msalInstance) {
        msalInstance.logoutRedirect({
          postLogoutRedirectUri: window.location.origin,
        });
      }
    },
    login: async () => {
      if (typeof window !== 'undefined' && msalInstance) {
        const { loginRequest } = await import('./msalConfig');
        msalInstance.loginRedirect(loginRequest);
      }
    },
  };
}
