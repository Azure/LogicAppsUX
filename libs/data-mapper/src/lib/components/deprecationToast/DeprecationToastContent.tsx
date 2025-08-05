import { Button, Toast, ToastBody, ToastTitle } from '@fluentui/react-components';
import { Warning20Regular, Dismiss20Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';

export interface DeprecationToastContentProps {
  onSwitchToV2: () => void;
  onDismiss: () => void;
}

export const DeprecationToastContent = ({ onSwitchToV2, onDismiss }: DeprecationToastContentProps) => {
  const intl = useIntl();

  const titleLoc = intl.formatMessage({
    defaultMessage: 'Data Mapper v1 is deprecated',
    id: 'RIwFkk',
    description: 'Title for Data Mapper v1 deprecation toast',
  });

  const messageLoc = intl.formatMessage({
    defaultMessage:
      'Data Mapper v1 is deprecated and will be removed in a future release. Switch to Data Mapper v2 for the latest features and improvements.',
    id: 'b3uc/U',
    description: 'Message for Data Mapper v1 deprecation toast',
  });

  const switchButtonLoc = intl.formatMessage({
    defaultMessage: 'Switch to v2',
    id: 'TIiSqe',
    description: 'Button text to switch to Data Mapper v2',
  });

  const dismissButtonLoc = intl.formatMessage({
    defaultMessage: 'Dismiss',
    id: 'CyI9Au',
    description: 'Button text to dismiss the deprecation toast',
  });

  return (
    <Toast>
      <ToastTitle
        media={<Warning20Regular />}
        action={<Button appearance="subtle" icon={<Dismiss20Regular />} onClick={onDismiss} aria-label={dismissButtonLoc} />}
      >
        {titleLoc}
      </ToastTitle>
      <ToastBody>
        {messageLoc}
        <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
          <Button appearance="primary" size="small" onClick={onSwitchToV2}>
            {switchButtonLoc}
          </Button>
        </div>
      </ToastBody>
    </Toast>
  );
};
