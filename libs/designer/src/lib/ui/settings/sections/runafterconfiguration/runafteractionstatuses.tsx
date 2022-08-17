import type { onChangeHandler } from './runafteractiondetails';
import { Checkbox } from '@fluentui/react/lib/Checkbox';
import { RUN_AFTER_STATUS } from '@microsoft-logic-apps/utils';
import { useIntl } from 'react-intl';

export interface RunAfterActionStatusesProps {
  isReadOnly: boolean;
  statuses: string[];
  onRenderLabel(status: string, label: string): JSX.Element;
  onStatusChange?: onChangeHandler;
}

export function RunAfterActionStatuses({ isReadOnly, statuses, onStatusChange, onRenderLabel }: RunAfterActionStatusesProps): JSX.Element {
  const intl = useIntl();
  const normalizedStatuses = statuses.map((status) => status.toUpperCase());

  const Resources = {
    RUN_AFTER_SUCCEEDED_STATUS: intl.formatMessage({
      defaultMessage: 'is successful',
      description: 'successful run',
    }),
    RUN_AFTER_TIMEDOUT_STATUS: intl.formatMessage({
      defaultMessage: 'has timed out',
      description: 'timed out run',
    }),
    RUN_AFTER_SKIPPED_STATUS: intl.formatMessage({
      defaultMessage: 'is skipped',
      description: 'skipped run',
    }),
    RUN_AFTER_FAILED_STATUS: intl.formatMessage({
      defaultMessage: 'has failed',
      description: 'failed run',
    }),
  };

  return (
    <div className="msla-run-after-statuses">
      <div className="msla-run-after-status-checkbox">
        <Checkbox
          checked={normalizedStatuses.includes(RUN_AFTER_STATUS.SUCCEEDED)}
          disabled={isReadOnly}
          label={Resources.RUN_AFTER_SUCCEEDED_STATUS}
          onChange={(_, checked) => onStatusChange?.(RUN_AFTER_STATUS.SUCCEEDED, checked)}
          onRenderLabel={() => onRenderLabel(RUN_AFTER_STATUS.SUCCEEDED, Resources.RUN_AFTER_SUCCEEDED_STATUS)}
        />
      </div>
      <div className="msla-run-after-status-checkbox">
        <Checkbox
          checked={normalizedStatuses.includes(RUN_AFTER_STATUS.TIMEDOUT)}
          disabled={isReadOnly}
          label={Resources.RUN_AFTER_TIMEDOUT_STATUS}
          onChange={(_, checked) => onStatusChange?.(RUN_AFTER_STATUS.TIMEDOUT, checked)}
          onRenderLabel={() => onRenderLabel(RUN_AFTER_STATUS.TIMEDOUT, Resources.RUN_AFTER_TIMEDOUT_STATUS)}
        />
      </div>
      <div className="msla-run-after-status-checkbox">
        <Checkbox
          checked={normalizedStatuses.includes(RUN_AFTER_STATUS.SKIPPED)}
          disabled={isReadOnly}
          label={Resources.RUN_AFTER_SKIPPED_STATUS}
          onChange={(_, checked) => onStatusChange?.(RUN_AFTER_STATUS.SKIPPED, checked)}
          onRenderLabel={() => onRenderLabel(RUN_AFTER_STATUS.SKIPPED, Resources.RUN_AFTER_SKIPPED_STATUS)}
        />
      </div>
      <div className="msla-run-after-status-checkbox">
        <Checkbox
          checked={normalizedStatuses.includes(RUN_AFTER_STATUS.FAILED)}
          disabled={isReadOnly}
          label={Resources.RUN_AFTER_FAILED_STATUS}
          onChange={(_, checked) => onStatusChange?.(RUN_AFTER_STATUS.FAILED, checked)}
          onRenderLabel={() => onRenderLabel(RUN_AFTER_STATUS.FAILED, Resources.RUN_AFTER_FAILED_STATUS)}
        />
      </div>
    </div>
  );
}
