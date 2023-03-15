import { MessageBar } from '@fluentui/react';
import { isNullOrUndefined } from '@microsoft/utils-logic-apps';

export interface ErrorSectionProps {
  className?: string;
  error?: any;
}

export const ErrorSection: React.FC<ErrorSectionProps> = ({ className, error }) => {
  const { errorMessage, errorLevel } = error;

  if (isNullOrUndefined(errorMessage)) {
    return null;
  }

  return (
    <MessageBar className={className} messageBarType={errorLevel}>
      <strong>{errorMessage}</strong>
    </MessageBar>
  );
};
