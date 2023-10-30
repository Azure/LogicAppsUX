import LogicApps from '../images/LogicApps.svg';
import { FontSizes, Link } from '@fluentui/react';
import { Tooltip } from '@fluentui/react-components';
import { ShieldCheckmarkRegular } from '@fluentui/react-icons';
import { IconButton } from '@fluentui/react/lib/Button';
import { useIntl } from 'react-intl';

interface CopilotPanelHeaderProps {
  closeCopilot: () => void;
}

export const CopilotPanelHeader = ({ closeCopilot }: CopilotPanelHeaderProps): JSX.Element => {
  const intl = useIntl();
  const headerTitle = intl.formatMessage({
    defaultMessage: 'Copilot',
    description: 'Chatbot header title',
  });
  const subtitleText = intl.formatMessage({
    defaultMessage: 'Preview',
    description: 'Label in the chatbot header stating the chatbot feature is a preview',
  });
  const protectedPillText = intl.formatMessage({
    defaultMessage: 'Protected',
    description: 'Label in the chatbot header stating that the users information is protected in this chatbot',
  });
  const protectedMessage = intl.formatMessage({
    defaultMessage: 'Your personal and company data are protected in this chat',
    description: 'Letting user know that their data is protected in the chatbot',
  });
  const closeButtonTitle = intl.formatMessage({
    defaultMessage: 'Close',
    description: 'Label for the close button in the chatbot header',
  });

  return (
    <div className={'msla-chatbot-header'}>
      <div className={'msla-chatbot-header-icon'}>
        <img src={LogicApps} alt="Logic Apps" />
      </div>
      <div className={'msla-chatbot-header-title-container'}>
        <div className={'msla-chatbot-header-title'}>{headerTitle}</div>
        <div className={'msla-chatbot-header-subtitle'}>{subtitleText}</div>
      </div>
      <div>
        <Tooltip content={protectedMessage} relationship="label" positioning="below" withArrow>
          <div className={'msla-chatbot-header-mode-protected-pill'}>
            <ShieldCheckmarkRegular className="shield-checkmark-regular" />
            <Link
              className="msla-protectedmessage-link"
              onClick={() => window.open('https://aka.ms/azurecopilot/privacystatement', '_blank')}
              isUnderlinedStyle={true}
            >
              {protectedPillText}
            </Link>
          </div>
        </Tooltip>{' '}
      </div>
      <IconButton
        className={'msla-chatbot-collapse-button'}
        title={closeButtonTitle}
        styles={{ icon: { fontSize: FontSizes.small } }}
        iconProps={{ iconName: 'Clear' }}
        onClick={() => {
          closeCopilot();
        }}
      />
    </div>
  );
};
