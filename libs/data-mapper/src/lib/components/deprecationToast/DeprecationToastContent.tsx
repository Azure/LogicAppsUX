import { Button, Link, Toast, ToastBody, ToastTitle } from '@fluentui/react-components';
import { Warning20Regular, Dismiss20Regular } from '@fluentui/react-icons';
import { FormattedMessage, useIntl } from 'react-intl';

export interface DeprecationToastContentProps {
  onSwitchToV2: () => void;
  onDismiss: () => void;
}

export const DeprecationToastContent = ({ onSwitchToV2, onDismiss }: DeprecationToastContentProps) => {
  const intl = useIntl();

  const titleLoc = intl.formatMessage({
    defaultMessage: 'Data Mapper v1 Deprecation',
    id: 'nQYeGr',
    description: 'Title for Data Mapper v1 deprecation toast',
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
        <FormattedMessage
          id="STkQLF"
          defaultMessage="Data Mapper v2 is now in GA! Please switch to v2 or reach out if you have any issues since v1 will be retired in September 2025. See <link>{linkText}</link> for more information. Click the button below to set default to v2, then reopen your map."
          values={{
            linkText: 'this announcement',
            link: (abc) => (
              <Link href="https://aka.ms/datamapperga" target="_blank" rel="noopener noreferrer">
                {abc}
              </Link>
            ),
          }}
          description="Message about new deprecation process and how to switch to v2"
        ></FormattedMessage>
        <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
          <Button appearance="primary" size="small" onClick={onSwitchToV2}>
            {switchButtonLoc}
          </Button>
        </div>
      </ToastBody>
    </Toast>
  );
};
