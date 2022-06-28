import { getStatusString } from '../../utils';
import { StatusIcon } from './statusicon';
import { css, TooltipHost } from '@fluentui/react';

export interface StatusPillProps {
  duration?: string;
  durationAnnounced?: string;
  hasRetries?: boolean;
  id?: string;
  status: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ duration, durationAnnounced, hasRetries = false, id, status }) => {
  const statusString = getStatusString(status, hasRetries);
  const durationString = [durationAnnounced, statusString].join('. ');
  const statusOnly = !duration || duration === '--';
  const label = statusOnly ? statusString : durationString;

  return (
    <div id={id} aria-label={label} role="status" className={css('msla-pill', statusOnly && 'status-only')}>
      <TooltipHost content={label}>
        <div className="msla-pill--inner">
          {!statusOnly && <span aria-hidden={true}>{duration}</span>}
          <StatusIcon hasRetries={hasRetries} status={status} />
        </div>
      </TooltipHost>
    </div>
  );
};
