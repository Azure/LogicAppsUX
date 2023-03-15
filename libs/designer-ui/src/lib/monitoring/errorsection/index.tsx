import { MessageBar } from '@fluentui/react';

export interface ErrorSectionProps {
  className?: string;
  error?: any;
}

export const ErrorSection: React.FC<ErrorSectionProps> = ({ className, error }) => {
  if (!error) {
    return null;
  }

  const { errorMessage, errorLevel } = error;
  return (
    <MessageBar className={className} messageBarType={errorLevel}>
      <strong>{errorMessage}</strong>
    </MessageBar>
  );
};
