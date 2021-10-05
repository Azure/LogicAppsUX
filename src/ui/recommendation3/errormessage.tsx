import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import * as React from 'react';

import { isEdge, isInternetExplorer } from '../helper';

export interface ErrorMessageProps {
  errorLevel?: MessageBarType;
  errorMessage?: string;
  visible: boolean;
}

const styles = {
  root: {
    wordBreak: isEdge() || isInternetExplorer() ? 'break-all' : 'break-word',
  },
};

export const ErrorMessage: React.FC<ErrorMessageProps> = (props) => {
  const { errorLevel = MessageBarType.success, errorMessage = '', visible } = props;
  if (!visible) {
    return null;
  }
  return (
    <MessageBar className="msla-recommendation-error" styles={styles} messageBarType={errorLevel}>
      {errorMessage}
    </MessageBar>
  );
};
