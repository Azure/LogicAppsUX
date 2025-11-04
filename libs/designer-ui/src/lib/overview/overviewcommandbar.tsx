import type { ButtonProps } from '@fluentui/react-components';
import { Button, Toolbar } from '@fluentui/react-components';
import { ArrowClockwiseRegular, PlayRegular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { ChatButton } from './chat';
import type { AgentURL } from '@microsoft/logic-apps-shared';

export interface OverviewCommandBarProps {
  triggerName?: string;
  isDarkMode?: boolean;
  isRefreshing?: boolean;
  isAgentWorkflow?: boolean;
  agentUrlLoading?: boolean;
  agentUrlData?: AgentURL;
  isWorkflowRuntimeRunning?: boolean;
  onRefresh(): void;
  onRunTrigger(): void;
}

export const OverviewCommandBar: React.FC<OverviewCommandBarProps> = ({
  isRefreshing,
  isDarkMode,
  isAgentWorkflow,
  agentUrlLoading,
  agentUrlData,
  isWorkflowRuntimeRunning,
  onRefresh,
  onRunTrigger,
  triggerName,
}) => {
  const intl = useIntl();

  const Resources = {
    OVERVIEW_REFRESH: intl.formatMessage({
      defaultMessage: 'Refresh',
      id: 'pr9GwA',
      description: 'Button text for refresh',
    }),
    OVERVIEW_RUN_TRIGGER: intl.formatMessage({
      defaultMessage: 'Run trigger',
      id: 'lPTdSf',
      description: 'Button text for run trigger',
    }),
  };

  const items: ButtonProps[] = [
    {
      'aria-label': Resources.OVERVIEW_REFRESH,
      disabled: isRefreshing,
      icon: <ArrowClockwiseRegular />,
      title: Resources.OVERVIEW_REFRESH,
      onClick: onRefresh,
    },
  ];

  if (!isAgentWorkflow) {
    items.unshift({
      'aria-label': Resources.OVERVIEW_RUN_TRIGGER,
      icon: <PlayRegular />,
      title: Resources.OVERVIEW_RUN_TRIGGER,
      onClick: onRunTrigger,
      disabled: !triggerName,
    });
  }

  const buttonCommonProps = {
    appearance: 'transparent',
    isDarkMode: isDarkMode,
    disabled: !isWorkflowRuntimeRunning,
  };

  return (
    <Toolbar data-testid="msla-overview-command-bar" style={{ padding: '8px 0' }}>
      {isAgentWorkflow ? (
        <ChatButton
          loading={agentUrlLoading}
          isWorkflowRuntimeRunning={isWorkflowRuntimeRunning}
          data={agentUrlData}
          buttonCommonProps={buttonCommonProps}
        />
      ) : null}
      {items.map((item, index) => (
        <Button key={index} appearance="transparent" {...item}>
          {item.title}
        </Button>
      ))}
    </Toolbar>
  );
};
