import { MessageBar, MessageBarType } from '@fluentui/react';

export interface ErrorSectionProps {
  className?: string;
  error?: ErrorShape;
}

interface ErrorShape {
  code: string;
  message: string;
  messageBarType?: MessageBarType;
}

export const ErrorSection: React.FC<ErrorSectionProps> = ({ className, error }) => {
  if (!error) {
    return null;
  }

  const { code, message, messageBarType } = error;
  return (
    <MessageBar className={className} messageBarType={messageBarType ?? MessageBarType.severeWarning}>
      <strong>{code}</strong>
      <div>{message}</div>
    </MessageBar>
  );
};
