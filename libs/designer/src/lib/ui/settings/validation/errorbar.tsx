import { Button, MessageBar, MessageBarActions, MessageBarBody, type MessageBarIntent } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { DismissRegular } from '@fluentui/react-icons';

export interface MessageBarProps {
  type: MessageBarIntent;
  message: string;
  onWarningDismiss?: () => void;
}

export function CustomizableMessageBar({ type, message, onWarningDismiss }: MessageBarProps): JSX.Element {
  const intl = useIntl();
  const dismissText = intl.formatMessage({
    defaultMessage: 'Dismiss',
    id: 'NkjtG/',
    description: 'Dismiss button text',
  });

  // Use role="alert" for error/warning to announce to screen readers immediately when added to DOM
  const role = type === 'error' || type === 'warning' ? 'alert' : undefined;

  return (
    <MessageBar intent={type} role={role} className="msla-setting-section-message-bar">
      <MessageBarBody>{message}</MessageBarBody>
      {onWarningDismiss && (
        <MessageBarActions
          containerAction={
            <Button aria-label={dismissText} appearance="transparent" icon={<DismissRegular />} onClick={onWarningDismiss} />
          }
        />
      )}
    </MessageBar>
  );
}
