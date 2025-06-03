import Workflow from '../images/Workflow.svg';
import { FontSizes, Link, useTheme } from '@fluentui/react';
import { Tooltip, mergeClasses } from '@fluentui/react-components';
import { ShieldCheckmarkRegular } from '@fluentui/react-icons';
import { IconButton } from '@fluentui/react/lib/Button';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { useChatbotStyles, useChatbotDarkStyles } from './styles';

interface CopilotPanelHeaderProps {
  closeCopilot: () => void;
}

export const CopilotPanelHeader = ({ closeCopilot }: CopilotPanelHeaderProps): JSX.Element => {
  const intl = useIntl();
  const { isInverted } = useTheme();

  // Styles
  const styles = useChatbotStyles();
  const darkStyles = useChatbotDarkStyles();

  const headerTitle = intl.formatMessage({
    defaultMessage: 'Workflow assistant',
    id: '2Gh+Gd',
    description: 'Chatbot header title',
  });
  const subtitleText = intl.formatMessage({
    defaultMessage: 'Preview',
    id: 'tu4TTM',
    description: 'Label in the chatbot header stating the chatbot feature is a preview',
  });
  const protectedPillText = intl.formatMessage({
    defaultMessage: 'Protected',
    id: '+3rROX',
    description: 'Label in the chatbot header stating that the users information is protected in this chatbot',
  });
  const protectedMessage = intl.formatMessage({
    defaultMessage: 'Your personal and company data are protected in this chat',
    id: 'Yrw/Qt',
    description: 'Letting user know that their data is protected in the chatbot',
  });
  const closeButtonTitle = intl.formatMessage({
    defaultMessage: 'Close',
    id: 'ZihyUf',
    description: 'Label for the close button in the chatbot header',
  });

  return (
    <div className={styles.header}>
      <div className={styles.headerIcon}>
        <img src={Workflow} alt="Logic Apps" />
      </div>
      <div className={styles.headerTitleContainer}>
        <div className={styles.headerTitle}>{headerTitle}</div>
        <div className={mergeClasses(styles.headerSubtitle, isInverted && darkStyles.headerSubtitle)}>{subtitleText}</div>
      </div>
      <div>
        <Tooltip content={protectedMessage} relationship="label" positioning="below" withArrow>
          <div className={styles.headerModeProtectedPill}>
            <ShieldCheckmarkRegular className={styles.shieldCheckmarkRegular} />
            <Link
              className={styles.protectedMessageLink}
              onClick={() => {
                window.open('https://aka.ms/azurecopilot/privacystatement', '_blank');
                LoggerService().log({
                  level: LogEntryLevel.Warning,
                  area: 'chatbot',
                  message: 'protection link opened',
                });
              }}
              underline={true}
            >
              {protectedPillText}
            </Link>
          </div>
        </Tooltip>
      </div>
      <IconButton
        className={styles.collapseButton}
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
