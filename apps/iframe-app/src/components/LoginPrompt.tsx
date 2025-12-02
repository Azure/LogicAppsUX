import { Button, Spinner } from '@fluentui/react-components';
import { PersonRegular } from '@fluentui/react-icons';

interface LoginPromptProps {
  title?: string;
  message?: string;
  buttonText?: string;
  onLogin: () => void;
  isLoading?: boolean;
}

export function LoginPrompt({
  title = 'Sign in required',
  message = 'Please sign in to continue using the chat.',
  buttonText = 'Sign in',
  onLogin,
  isLoading = false,
}: LoginPromptProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'sans-serif',
        textAlign: 'center',
        padding: '20px',
        backgroundColor: '#f5f5f5',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '40px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          maxWidth: '400px',
          width: '100%',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#0078d4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <PersonRegular style={{ fontSize: '32px', color: '#ffffff' }} />
        </div>
        <h2 style={{ color: '#323130', marginBottom: '12px', fontSize: '24px', fontWeight: 600 }}>{title}</h2>
        <p style={{ color: '#605e5c', fontSize: '14px', lineHeight: '20px' }}>{message}</p>
        <Button
          appearance="primary"
          size="large"
          onClick={onLogin}
          disabled={isLoading}
          style={{
            minWidth: '200px',
            height: '44px',
          }}
        >
          {isLoading ? <Spinner size="tiny" style={{ marginRight: '8px' }} /> : null}
          {isLoading ? 'Signing in...' : buttonText}
        </Button>
      </div>
    </div>
  );
}
