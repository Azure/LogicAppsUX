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

  return (
    <MessageBar intent={type} className="msla-setting-section-message-bar">
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
