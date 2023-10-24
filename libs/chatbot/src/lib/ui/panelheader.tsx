import LogicApps from '../images/LogicApps.svg';
import { FontSizes } from '@fluentui/react';
import { IconButton } from '@fluentui/react/lib/Button';
import { useIntl } from 'react-intl';

interface CopilotPanelHeaderProps {
  collapsed: boolean;
  toggleCollapse: (b: boolean) => void;
}

export const CopilotPanelHeader = ({ collapsed, toggleCollapse }: CopilotPanelHeaderProps): JSX.Element => {
  const intl = useIntl();
  const headerTitle = intl.formatMessage({
    defaultMessage: 'Copilot',
    description: 'Chatbot header title',
  });
  const pillText = intl.formatMessage({
    defaultMessage: 'Preview',
    description: 'Label in the chatbot header stating the chatbot feature is a preview',
  });
  const protectedPillText = intl.formatMessage({
    defaultMessage: 'Protected',
    description: 'Label in the chatbot header stating that the users information is ptotected in this chatbot',
  });

  const collapseButtonTitle = intl.formatMessage({
    defaultMessage: 'Collapse',
    description: 'Label for the collapse button in the chatbot header',
  });
  const expandButtonTitle = intl.formatMessage({
    defaultMessage: 'Expand',
    description: 'Label for the expand button in the chatbot header',
  });

  return (
    <div className={collapsed ? 'msla-chatbot-header-collapsed' : 'msla-chatbot-header'}>
      {collapsed ? null : (
        <>
          <div className={'msla-chatbot-header-icon'}>
            <img src={LogicApps} alt="Logic Apps" />
          </div>
          <div className={'msla-chatbot-header-title'}>{headerTitle}</div>
          <div className={'msla-chatbot-header-mode-protected-pill'}>{protectedPillText}</div>{' '}
          <div className={'msla-chatbot-header-mode-pill'}>{pillText}</div>{' '}
        </>
      )}
      <IconButton
        className={'msla-chatbot-collapse-button'}
        title={collapsed ? expandButtonTitle : collapseButtonTitle}
        styles={{ icon: { fontSize: FontSizes.small } }}
        iconProps={{ iconName: collapsed ? 'DoubleChevronRight' : 'DoubleChevronLeft' }}
        onClick={() => {
          toggleCollapse(!collapsed);
        }}
      />
    </div>
  );
};
