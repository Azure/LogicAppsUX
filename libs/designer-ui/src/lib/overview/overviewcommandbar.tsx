import type { CallbackInfo } from './types';
import { getCallbackUrl } from './utils';
import type { ICommandBarItemProps } from '@fluentui/react';
import { CommandBar } from '@fluentui/react';
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
      description: 'Button text for refresh',
    }),
    OVERVIEW_RUN_TRIGGER: intl.formatMessage({
      defaultMessage: 'Run trigger',
      description: 'Button text for run trigger',
    }),
  };

  const items: ICommandBarItemProps[] = [
    {
      ariaLabel: Resources.OVERVIEW_REFRESH,
      disabled: isRefreshing,
      iconProps: { iconName: 'Refresh' },
      key: 'Refresh',
      name: Resources.OVERVIEW_REFRESH,
      onClick: onRefresh,
    },
  ];

  if (callbackUrl) {
    items.push({
      ariaLabel: Resources.OVERVIEW_RUN_TRIGGER,
      iconProps: { iconName: 'Play' },
      key: 'RunTrigger',
      name: Resources.OVERVIEW_RUN_TRIGGER,
      onClick: onRunTrigger,
    });
  }

  return <CommandBar data-testid="msla-overview-command-bar" items={items} />;
};
