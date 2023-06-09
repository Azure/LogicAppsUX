import { getDurationStringFromTimes, getStatusString } from '../../utils';
import { StatusIcon } from './statusicon';
import { css, TooltipHost } from '@fluentui/react';

export interface StatusPillProps {
  id?: string;
  duration?: string;
  startTime?: string;
  endTime?: string;
  hasRetries?: boolean;
  status?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  id,
  duration = '0s',
  startTime,
  endTime,
  hasRetries = false,
  status = 'Waiting',
}) => {
  const statusString = getStatusString(status, hasRetries);
  let tooltipLabel = statusString;
  const statusOnly = !duration || duration === '--' || !startTime || !endTime;
  if (!statusOnly) {
    const fullDurationString = getDurationStringFromTimes(startTime, endTime, false);
    tooltipLabel = [fullDurationString, statusString].join('. ');
  }

  return (
    <div id={id} aria-label={tooltipLabel} role="status" className={css('msla-pill', statusOnly && 'status-only')}>
      <TooltipHost content={tooltipLabel}>
        <div className="msla-pill--inner">
          {!statusOnly && <span aria-hidden={true}>{duration}</span>}
          <StatusIcon hasRetries={hasRetries} status={status} />
        </div>
      </TooltipHost>
    </div>
  );
};
