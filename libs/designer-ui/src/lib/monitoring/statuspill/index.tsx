import { Tooltip, mergeClasses } from '@fluentui/react-components';
import { getDurationStringFromTimes, getStatusString } from '../../utils';
import { StatusIcon } from './statusicon';
import { replaceWhiteSpaceWithUnderscore } from '@microsoft/logic-apps-shared';
import { useStatusPillStyles } from './statuspill.styles';

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
  const styles = useStatusPillStyles();
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
      className={mergeClasses(styles.pill, statusOnly && styles.statusOnly)}
    >
      <Tooltip content={tooltipLabel} relationship="description" withArrow>
        <div className={mergeClasses(styles.pillInner, statusOnly && styles.statusOnlyImg)}>
          {!statusOnly && <span aria-hidden={true}>{duration}</span>}
          <StatusIcon hasRetries={hasRetries} status={status} iconOpacity={resubmittedResults ? '50%' : '100%'} />
        </div>
      </Tooltip>
    </div>
  );
};
