import type { ButtonProps } from '@fluentui/react-components';
import { Button, Toolbar } from '@fluentui/react-components';
import { ArrowClockwiseRegular, ArrowLeftRegular, PlayRegular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { ChatButton } from './chat';
import type { AgentURL } from '@microsoft/logic-apps-shared';

export interface OverviewCommandBarProps {
  canRunTrigger?: boolean;
  isDarkMode?: boolean;
  isRefreshing?: boolean;
  isAgentWorkflow?: boolean;
  agentUrlLoading?: boolean;
  agentUrlData?: AgentURL;
  isRunTriggerPending?: boolean;
  isWorkflowRuntimeRunning?: boolean;
  onRefresh(): void;
  onRunTrigger(): void;
  onOpenProjectOverview?(): void;
}

export const OverviewCommandBar: React.FC<OverviewCommandBarProps> = ({
  isRefreshing,
  isDarkMode,
  isAgentWorkflow,
  agentUrlLoading,
  agentUrlData,
  isRunTriggerPending,
  isWorkflowRuntimeRunning,
  onRefresh,
  onRunTrigger,
  canRunTrigger,
  onOpenProjectOverview,
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
    ALL_PROJECT_WORKFLOWS: intl.formatMessage({
      defaultMessage: 'All project workflows',
      id: 'hiX2AZ',
      description: 'Button text for returning from a workflow overview to the project overview',
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
      disabled: !isWorkflowRuntimeRunning || !canRunTrigger || isRunTriggerPending,
    });
  }

  const buttonCommonProps = {
    appearance: 'transparent',
    isDarkMode: isDarkMode,
    disabled: !isWorkflowRuntimeRunning,
  };

  return (
    <Toolbar data-testid="msla-overview-command-bar" style={{ padding: '8px 0' }}>
      {onOpenProjectOverview ? (
        <Button
          appearance="transparent"
          aria-label={Resources.ALL_PROJECT_WORKFLOWS}
          icon={<ArrowLeftRegular />}
          onClick={onOpenProjectOverview}
          title={Resources.ALL_PROJECT_WORKFLOWS}
        >
          {Resources.ALL_PROJECT_WORKFLOWS}
        </Button>
      ) : null}
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
