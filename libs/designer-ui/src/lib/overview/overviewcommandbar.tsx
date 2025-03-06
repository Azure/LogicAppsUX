import type { ButtonProps } from '@fluentui/react-components';
import { Button, Toolbar } from '@fluentui/react-components';
import { ArrowClockwiseRegular, PlayRegular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';

export interface OverviewCommandBarProps {
  triggerName?: string;
  isRefreshing?: boolean;
  onRefresh(): void;
  onRunTrigger(): void;
}

export const OverviewCommandBar: React.FC<OverviewCommandBarProps> = ({ isRefreshing, onRefresh, onRunTrigger, triggerName }) => {
  const intl = useIntl();

  const Resources = {
    OVERVIEW_REFRESH: intl.formatMessage({
      defaultMessage: 'Refresh',
      id: 'a6bf46c006c4',
      description: 'Button text for refresh',
    }),
    OVERVIEW_RUN_TRIGGER: intl.formatMessage({
      defaultMessage: 'Run trigger',
      id: '94f4dd49fafa',
      description: 'Button text for run trigger',
    }),
  };

  const items: ButtonProps[] = [
    {
      'aria-label': Resources.OVERVIEW_RUN_TRIGGER,
      icon: <PlayRegular />,
      title: Resources.OVERVIEW_RUN_TRIGGER,
      onClick: onRunTrigger,
      disabled: !triggerName,
    },
    {
      'aria-label': Resources.OVERVIEW_REFRESH,
      disabled: isRefreshing,
      icon: <ArrowClockwiseRegular />,
      title: Resources.OVERVIEW_REFRESH,
      onClick: onRefresh,
    },
  ];

  return (
    <Toolbar data-testid="msla-overview-command-bar" style={{ padding: '8px 0' }}>
      {items.map((item, index) => (
        <Button key={index} appearance="transparent" {...item}>
          {item.title}
        </Button>
      ))}
    </Toolbar>
  );
};
