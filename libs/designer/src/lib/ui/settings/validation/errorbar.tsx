import { MessageBar, MessageBarType, type IMessageBarStyles } from '@fluentui/react/lib/MessageBar';
import { isHighContrastBlack } from '@microsoft/designer-ui';

export interface MessageBarProps {
  message: string;
  onErrorDismiss?: () => void | undefined;
}

const messageBarStyles: IMessageBarStyles = isHighContrastBlack()
  ? { content: { background: '#442726' }, innerText: { color: '#f3f2f1' } }
  : {};

export const ErrorBar = ({ message }: MessageBarProps): JSX.Element => {
  return (
    <div className="msla-setting-section-error-bar">
      <MessageBar styles={messageBarStyles} messageBarType={MessageBarType.error}>
        {message}
      </MessageBar>
    </div>
  );
};

export const WarningBar = ({ message, onErrorDismiss }: MessageBarProps): JSX.Element => {
  return (
    <MessageBar styles={messageBarStyles} messageBarType={MessageBarType.warning} onDismiss={onErrorDismiss}>
      {message}
    </MessageBar>
  );
};
