import type { Route } from './+types/home';
import React from 'react';
import { UserProfile } from '../components/UserProfile';
import { ClientOnly } from '../components/ClientOnly';

// These will be loaded dynamically on the client
let makeStyles: any;
let shorthands: any;
let tokens: any;
let FluentProvider: any;
let webDarkTheme: any;

if (typeof window !== 'undefined') {
  const fluentUI = await import('@fluentui/react-components');
  makeStyles = fluentUI.makeStyles;
  shorthands = fluentUI.shorthands;
  tokens = fluentUI.tokens;
  FluentProvider = fluentUI.FluentProvider;
  webDarkTheme = fluentUI.webDarkTheme;
}

const createStyles = () => {
  if (!makeStyles) {
    return () => ({});
  }

  return makeStyles({
    loadingContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
    },
    loadingContent: {
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
    loadingText: {
      color: tokens.colorNeutralForeground2,
    },
    pageContainer: {
      minHeight: '100vh',
      backgroundColor: tokens.colorNeutralBackground3,
    },
    contentWrapper: {
      maxWidth: '1280px',
      marginLeft: 'auto',
      marginRight: 'auto',
      ...shorthands.padding(tokens.spacingVerticalL),
    },
    profileSection: {
      marginBottom: tokens.spacingVerticalXL,
    },
  });
};

const useStyles = createStyles();

export function meta(_: Route.MetaArgs) {
  return [{ title: 'Otto - Logic Apps UX' }, { name: 'description', content: 'Welcome to Otto!' }];
}

export default function Home() {
  const styles = useStyles();

  return (
    <ClientOnly
      fallback={
        <div className={styles.loadingContainer}>
          <div className={styles.loadingContent}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Loading...</p>
          </div>
        </div>
      }
    >
      <HomeContent />
    </ClientOnly>
  );
}

function HomeContent() {
  const styles = useStyles();
  const [AuthComponents, setAuthComponents] = React.useState<{
    AuthProvider: React.ComponentType<{ children: React.ReactNode }>;
    RequireAuth: React.ComponentType<{ children: React.ReactNode }>;
  } | null>(null);

  React.useEffect(() => {
    // Dynamically import auth provider components on client side only
    import('../auth/AuthProvider').then((module) => {
      setAuthComponents({
        AuthProvider: module.AuthProvider,
        RequireAuth: module.RequireAuth,
      });
    });
  }, []);

  // Show loading state while auth components are being imported
  if (!AuthComponents) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Loading...</p>
        </div>
      </div>
    );
  }

  const { AuthProvider, RequireAuth } = AuthComponents;

  if (!FluentProvider || !webDarkTheme) {
    return null;
  }

  return (
    <FluentProvider theme={webDarkTheme}>
      <AuthProvider>
        <RequireAuth>
          <div className={styles.pageContainer}>
            <div className={styles.contentWrapper}>
              <div className={styles.profileSection}>
                <UserProfile />
              </div>
            </div>
          </div>
        </RequireAuth>
      </AuthProvider>
    </FluentProvider>
  );
}
