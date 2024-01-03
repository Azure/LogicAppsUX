import type { onChangeHandler } from './runafteractiondetails';
import { Text, Checkbox } from '@fluentui/react-components';
import { Failed, Skipped, Succeeded, TimedOut } from '@microsoft/designer-ui';
import { RUN_AFTER_STATUS } from '@microsoft/utils-logic-apps';
import { useIntl } from 'react-intl';

export interface RunAfterActionStatusesProps {
  isReadOnly: boolean;
  statuses: string[];
  onStatusChange?: onChangeHandler;
}

export function RunAfterActionStatuses({ isReadOnly, statuses, onStatusChange }: RunAfterActionStatusesProps): JSX.Element {
  const intl = useIntl();
  const normalizedStatuses = statuses.map((status) => status.toUpperCase());

  const data = [
    {
      id: RUN_AFTER_STATUS.SUCCEEDED,
      label: intl.formatMessage({
        defaultMessage: 'Is successful',
        description: 'Successful run',
      }),
      icon: <Succeeded />,
    },
    {
      id: RUN_AFTER_STATUS.TIMEDOUT,
      label: intl.formatMessage({
        defaultMessage: 'Has timed out',
        description: 'Timed out run',
      }),
      icon: <TimedOut />,
    },
    {
      id: RUN_AFTER_STATUS.SKIPPED,
      label: intl.formatMessage({
        defaultMessage: 'Is skipped',
        description: 'Skipped run',
      }),
      icon: <Skipped />,
    },
    {
      id: RUN_AFTER_STATUS.FAILED,
      label: intl.formatMessage({
        defaultMessage: 'Has failed',
        description: 'Failed run',
      }),
      icon: <Failed />,
    },
  ];

  return (
    <div className="msla-run-after-statuses">
      {data.map((status) => (
        <Checkbox
          key={status.id}
          checked={normalizedStatuses.includes(status.id)}
          disabled={isReadOnly}
          label={
            <div className="status-label">
              {status.icon}
              <Text>{status.label}</Text>
            </div>
          }
          onChange={(_, data) => onStatusChange?.(status.id, !!data.checked)}
        />
      ))}
    </div>
  );
}
