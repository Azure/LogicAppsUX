import { Button, Card, Spinner, Title3 } from '@fluentui/react-components';
import { PersonRegular } from '@fluentui/react-icons';
import { useLoginPromptStyles } from './LoginPromptStyles';

interface LoginPromptProps {
  onLogin: () => void;
  isLoading?: boolean;
  error?: string;
}

export function LoginPrompt({ onLogin, isLoading = false, error }: LoginPromptProps) {
  const styles = useLoginPromptStyles();

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.iconContainer}>
          <PersonRegular className={styles.icon} />
        </div>
        <Title3>Sign in required</Title3>
        <p className={styles.message}>Please sign in to continue using the chat</p>
        {error && <div className={styles.errorMessage}>{error}</div>}
        <Button appearance="primary" size="large" onClick={onLogin} disabled={isLoading} className={styles.button}>
          {isLoading ? <Spinner size="tiny" className={styles.spinner} /> : null}
          {isLoading ? 'Signing in...' : 'Sign in'}
        </Button>
      </Card>
    </div>
  );
}
