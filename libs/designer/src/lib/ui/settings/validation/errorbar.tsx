import { MessageBar, type MessageBarType, type IMessageBarStyles } from '@fluentui/react/lib/MessageBar';
import { isHighContrastBlack } from '@microsoft/designer-ui';

export interface MessageBarProps {
  type: MessageBarType;
  message: string;
  onWarningDismiss?: () => void | undefined;
}

const messageBarStyles: IMessageBarStyles = isHighContrastBlack()
  ? { content: { background: '#442726' }, innerText: { color: '#f3f2f1' } }
  : {};

export function CustomizableMessageBar({ type, message, onWarningDismiss }: MessageBarProps): JSX.Element {
  if (onWarningDismiss) {
    return (
      <div className="msla-setting-section-message-bar">
        <MessageBar styles={messageBarStyles} messageBarType={type} onDismiss={onWarningDismiss}>
          {message}
        </MessageBar>
      </div>
    );
  }
  return (
    <div className="msla-setting-section-message-bar">
      <MessageBar styles={messageBarStyles} messageBarType={type}>
        {message}
      </MessageBar>
    </div>
  );
}
