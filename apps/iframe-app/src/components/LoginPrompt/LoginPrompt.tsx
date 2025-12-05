import { Button, Card, Spinner, Title3 } from '@fluentui/react-components';
import { PersonRegular } from '@fluentui/react-icons';
import { useLoginPromptStyles } from './LoginPromptStyles';
import { useIframeStrings } from '../../lib/intl/strings';

interface LoginPromptProps {
  onLogin: () => void;
  isLoading?: boolean;
}

export function LoginPrompt({ onLogin, isLoading = false }: LoginPromptProps) {
  const styles = useLoginPromptStyles();
  const strings = useIframeStrings();

  return (
    <div className={styles.container}>
      <Card className={styles.card}>
        <div className={styles.iconContainer}>
          <PersonRegular className={styles.icon} />
        </div>
        <Title3>{strings.login.signInRequired}</Title3>
        <p className={styles.message}>{strings.login.pleaseSignIn}</p>
        <Button appearance="primary" size="large" onClick={onLogin} disabled={isLoading} className={styles.button}>
          {isLoading ? <Spinner size="tiny" className={styles.spinner} /> : null}
          {isLoading ? strings.login.signingIn : strings.login.signIn}
        </Button>
      </Card>
    </div>
  );
}
