import { Button, Card, MessageBar, MessageBarBody, Spinner, Title3 } from '@fluentui/react-components';
import { PersonRegular } from '@fluentui/react-icons';
import { useLoginPromptStyles } from './LoginPromptStyles';
import type { IdentityProvider } from '../../lib/utils/config-parser';
import { useRef } from 'react';

interface LoginPromptProps {
  onLogin: (provider: IdentityProvider) => void;
  isLoading?: boolean;
  error?: string;
  identityProviders?: Record<string, IdentityProvider>;
}

export function LoginPrompt({ onLogin, isLoading = false, error, identityProviders }: LoginPromptProps) {
  const styles = useLoginPromptStyles();
  const loadingProviderKeyRef = useRef<string | null>(null);

  const identityProvidersEntries = identityProviders ? Object.entries(identityProviders) : [];

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.iconContainer}>
          <PersonRegular className={styles.icon} />
        </div>
        <Title3>Sign in required</Title3>
        <p className={styles.message}>Sign in to continue using the chat</p>
        {error && (
          <MessageBar intent="error" icon={null} className={styles.messageBar}>
            <MessageBarBody>{error}</MessageBarBody>
          </MessageBar>
        )}
        {identityProvidersEntries.length > 0 ? (
          <div className={styles.identityProviders}>
            {identityProvidersEntries.map(([key, provider]) => (
              <Button
                key={key}
                appearance="primary"
                size="large"
                onClick={() => {
                  loadingProviderKeyRef.current = key;
                  onLogin(provider);
                }}
                disabled={isLoading}
                className={styles.button}
              >
                {isLoading && loadingProviderKeyRef.current === key ? <Spinner size="tiny" className={styles.spinner} /> : null}
                {isLoading && loadingProviderKeyRef.current === key ? 'Signing in...' : `${provider.name} account`}
              </Button>
            ))}
          </div>
        ) : (
          <MessageBar intent="info" icon={null} className={styles.messageBar}>
            <MessageBarBody>{'Configure easy auth and identity providers to enable chat client authentication'}</MessageBarBody>
          </MessageBar>
        )}
      </Card>
    </div>
  );
}
