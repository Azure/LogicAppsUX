import { MessageBarType } from '@fluentui/react';
import { Text, MessageBar, MessageBarBody, type MessageBarIntent, MessageBarTitle } from '@fluentui/react-components';
import { useMemo } from 'react';

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
  const messageBarIntent = useMemo((): MessageBarIntent => {
    switch (error?.messageBarType) {
      case MessageBarType.error:
        return 'error';
      case MessageBarType.warning:
        return 'warning';
      case MessageBarType.info:
        return 'info';
      case MessageBarType.success:
        return 'success';
      default:
        return 'error';
    }
  }, [error?.messageBarType]);

  if (!error) {
    return null;
  }

  return (
    <MessageBar className={className} intent={messageBarIntent} layout={'multiline'}>
      <MessageBarBody>
        <MessageBarTitle>{error.code}</MessageBarTitle>
        <br />
        <Text>{error.message}</Text>
      </MessageBarBody>
    </MessageBar>
  );
};
