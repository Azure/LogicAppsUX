import LogicApps from '../images/LogicApps.svg';
import { FontSizes } from '@fluentui/react';
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
