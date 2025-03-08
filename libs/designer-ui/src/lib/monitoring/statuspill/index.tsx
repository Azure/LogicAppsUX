import { Tooltip } from '@fluentui/react-components';
import { getDurationStringFromTimes, getStatusString } from '../../utils';
import { StatusIcon } from './statusicon';
import { css } from '@fluentui/react';
import { replaceWhiteSpaceWithUnderscore } from '@microsoft/logic-apps-shared';

export interface StatusPillProps {
  id: string;
  duration?: string;
  startTime?: string;
  endTime?: string;
  hasRetries?: boolean;
  status?: string;
  resubmittedResults?: boolean;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  id,
  duration = '0s',
  startTime,
  endTime,
  hasRetries = false,
  resubmittedResults = false,
  status,
}) => {
  const statusString = getStatusString(status, hasRetries);
  let tooltipLabel = statusString;
  const statusOnly = !duration || duration === '--' || !startTime || !endTime;
  if (!statusOnly) {
    const fullDurationString = getDurationStringFromTimes(startTime, endTime, false);
    tooltipLabel = [fullDurationString, statusString].join('. ');
  }

  return (
    <div
      id={id}
      data-automation-id={`msla-pill-${replaceWhiteSpaceWithUnderscore(id)}`}
      aria-label={tooltipLabel}
      role="status"
      className={css('msla-pill', statusOnly && 'status-only')}
    >
      <Tooltip content={tooltipLabel} relationship="description" withArrow>
        <div className="msla-pill--inner">
          {!statusOnly && <span aria-hidden={true}>{duration}</span>}
          <StatusIcon hasRetries={hasRetries} status={status} iconOpacity={resubmittedResults ? '50%' : '100%'} />
        </div>
      </Tooltip>
    </div>
  );
};
