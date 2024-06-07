import type { ButtonProps } from '@fluentui/react-components';
import { Button, Toolbar } from '@fluentui/react-components';
import { ArrowClockwiseRegular, PlayRegular } from '@fluentui/react-icons';
import { getCallbackUrl } from '@microsoft/logic-apps-shared';
import type { CallbackInfo } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

export interface OverviewCommandBarProps {
  callbackInfo?: CallbackInfo;
  isRefreshing?: boolean;
  onRefresh(): void;
  onRunTrigger(): void;
}

export const OverviewCommandBar: React.FC<OverviewCommandBarProps> = ({ callbackInfo, isRefreshing, onRefresh, onRunTrigger }) => {
  const intl = useIntl();
  const callbackUrl = useMemo(() => getCallbackUrl(callbackInfo), [callbackInfo]);

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

  if (callbackUrl) {
    items.push({
      'aria-label': Resources.OVERVIEW_RUN_TRIGGER,
      icon: <PlayRegular />,
      title: Resources.OVERVIEW_RUN_TRIGGER,
      onClick: onRunTrigger,
      disabled: false,
    });
  }

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
