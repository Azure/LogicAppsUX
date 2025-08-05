import { Button, Toast, ToastBody, ToastTitle, Link } from '@fluentui/react-components';
import { Warning20Regular, Dismiss20Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';

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
        See{' '}
        <Link
          href="https://techcommunity.microsoft.com/blog/integrationsonazureblog/%F0%9F%9A%80-new--improved-data-mapper-ux-in-azure-logic-apps-%E2%80%93-now-in-public-preview/4377088"
          target="_blank"
          rel="noopener noreferrer"
        >
          this announcement
        </Link>{' '}
        for more information. Click the button below to set default to v2, then reopen your map.
        <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
          <Button appearance="primary" size="small" onClick={onSwitchToV2}>
            {switchButtonLoc}
          </Button>
        </div>
      </ToastBody>
    </Toast>
  );
};
