import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import type { IMessageBarStyles } from '@fluentui/react/lib/MessageBar';
import { isHighContrastBlack } from '@microsoft/designer-ui';

export interface MessageBarProps {
  message: string;
}

const messageBarStyles: IMessageBarStyles = isHighContrastBlack()
  ? { content: { background: '#442726' }, innerText: { color: '#f3f2f1' } }
  : {};

export const ErrorBar = ({ message }: MessageBarProps): JSX.Element => {
  return (
    <MessageBar styles={messageBarStyles} messageBarType={MessageBarType.error}>
      {message}
    </MessageBar>
  );
};

export const WarningBar = ({ message }: MessageBarProps): JSX.Element => {
  return (
    <MessageBar styles={messageBarStyles} messageBarType={MessageBarType.warning}>
      {message}
    </MessageBar>
  );
};
