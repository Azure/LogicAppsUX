import { Button, Card, MessageBar, MessageBarBody, Spinner, Title3 } from '@fluentui/react-components';
import { PersonRegular } from '@fluentui/react-icons';
import { useLoginPromptStyles } from './LoginPromptStyles';
import type { IdentityProvider } from '../../lib/utils/config-parser';
import { useState } from 'react';

interface LoginPromptProps {
  onLogin: (provider: IdentityProvider) => void;
  isLoading?: boolean;
  error?: string;
  identityProviders?: Record<string, IdentityProvider>;
}

export function LoginPrompt({ onLogin, isLoading = false, error, identityProviders }: LoginPromptProps) {
  const styles = useLoginPromptStyles();
  const [loadingProviderKey, setLoadingProviderKey] = useState<string | null>(null);

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.iconContainer}>
          <PersonRegular className={styles.icon} />
        </div>
        <Title3>Sign in required</Title3>
        <p className={styles.message}>Sign in to continue using the chat</p>
        {error && (
          <MessageBar intent="error" icon={null} className={styles.errorMessage}>
            <MessageBarBody>{error}</MessageBarBody>
          </MessageBar>
        )}
        {identityProviders && (
          <div className={styles.identityProviders}>
            {Object.entries(identityProviders).map(([key, provider]) => (
              <Button
                key={key}
                appearance="primary"
                size="large"
                onClick={() => {
                  setLoadingProviderKey(key);
                  onLogin(provider);
                }}
                disabled={isLoading}
                className={styles.button}
              >
                {isLoading && loadingProviderKey === key ? <Spinner size="tiny" className={styles.spinner} /> : null}
                {isLoading && loadingProviderKey === key ? 'Signing in...' : `${provider.name} account`}
              </Button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
