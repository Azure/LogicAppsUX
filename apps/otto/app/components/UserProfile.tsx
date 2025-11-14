import React from 'react';
import { ClientOnly } from './ClientOnly';

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

const createStyles = () => {
  if (!makeStyles) {
    return () => ({});
  }

  return makeStyles({
    container: {
      display: 'flex',
      alignItems: 'center',
      gap: tokens.spacingHorizontalL,
      ...shorthands.padding(tokens.spacingVerticalL),
      backgroundColor: tokens.colorNeutralBackground1,
      boxShadow: tokens.shadow4,
      ...shorthands.borderRadius(tokens.borderRadiusMedium),
    },
    userInfo: {
      flexGrow: 1,
    },
    userName: {
      fontSize: tokens.fontSizeBase300,
      fontWeight: tokens.fontWeightSemibold,
      color: tokens.colorNeutralForeground1,
    },
    userEmail: {
      fontSize: tokens.fontSizeBase200,
      color: tokens.colorNeutralForeground2,
    },
    button: {
      ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalL),
      fontSize: tokens.fontSizeBase300,
      fontWeight: tokens.fontWeightSemibold,
      color: tokens.colorNeutralForegroundOnBrand,
      backgroundColor: tokens.colorBrandBackground,
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
  });
};

const useStyles = createStyles();

/**
 * User profile component that displays the logged-in user's information
 * and provides a logout button
 */
export function UserProfile() {
  return (
    <ClientOnly>
      <UserProfileClient />
    </ClientOnly>
  );
}

function UserProfileClient() {
  const [msalHooks, setMsalHooks] = React.useState<{
    useMsal: () => any;
    useIsAuthenticated: () => boolean;
  } | null>(null);

  React.useEffect(() => {
    // Dynamic import to avoid SSR issues
    import('@azure/msal-react').then((module) => {
      setMsalHooks({
        useMsal: module.useMsal,
        useIsAuthenticated: module.useIsAuthenticated,
      });
    });
  }, []);

  if (!msalHooks) {
    return null;
  }

  return <UserProfileContent msalHooks={msalHooks} />;
}

function UserProfileContent({
  msalHooks,
}: {
  msalHooks: {
    useMsal: () => any;
    useIsAuthenticated: () => boolean;
  };
}) {
  const styles = useStyles();
  const { accounts, instance } = msalHooks.useMsal();
  const isAuthenticated = msalHooks.useIsAuthenticated();

  if (!isAuthenticated || !accounts[0]) {
    return null;
  }

  const account = accounts[0];

  const handleLogout = () => {
    instance.logoutRedirect({
      postLogoutRedirectUri: window.location.origin,
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.userInfo}>
        <p className={styles.userName}>{account.name || 'User'}</p>
        <p className={styles.userEmail}>{account.username}</p>
      </div>
      <button onClick={handleLogout} className={styles.button} type="button">
        Sign Out
      </button>
    </div>
  );
}
