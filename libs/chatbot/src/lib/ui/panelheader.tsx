import Workflow from '../images/Workflow.svg';
import { Badge, Link, Tooltip, Subtitle2 } from '@fluentui/react-components';
import { ShieldCheckmarkRegular } from '@fluentui/react-icons';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { useChatbotStyles } from './styles';

export const CopilotPanelHeader = (): JSX.Element => {
  const intl = useIntl();

  // Styles
  const styles = useChatbotStyles();

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

  return (
    <div className={styles.header}>
      <div className={styles.headerIcon}>
        <img src={Workflow} alt="Logic Apps" />
      </div>
      <div>
        <h2 className={styles.headerTitle}>{headerTitle}</h2>
        <Subtitle2 className={styles.headerSubtitle}>{subtitleText}</Subtitle2>
      </div>
      <div style={{ flexGrow: 1 }} />
      <Tooltip content={protectedMessage} relationship="label" positioning="below" withArrow>
        <Link
          className={styles.protectedBadgeLink}
          href="https://aka.ms/azurecopilot/privacystatement"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            LoggerService().log({
              level: LogEntryLevel.Warning,
              area: 'chatbot',
              message: 'protection link opened',
            });
          }}
        >
          <Badge size="small" color="success" appearance="filled" icon={<ShieldCheckmarkRegular />}>
            {protectedPillText}
          </Badge>
        </Link>
      </Tooltip>
    </div>
  );
};
