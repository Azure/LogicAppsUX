import { TooltipHost } from '@fluentui/react';
import { getStatusString } from '../../utils/utils';
import { StatusIcon } from './statusicon';

export interface StatusPillProps {
  duration?: string;
  durationAnnounced?: string;
  hasRetries?: boolean;
  id?: string;
  status: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ duration, durationAnnounced, hasRetries = false, id, status }) => {
  const statusString = getStatusString(status, hasRetries);

  if (!duration || duration === '--') {
    return (
      <div id={id} aria-label={statusString} className="msla-pill status-only">
        <TooltipHost content={statusString}>
          <div className="msla-pill--inner">
            <StatusIcon hasRetries={hasRetries} status={status} />
          </div>
        </TooltipHost>
      </div>
    );
  }

  const ariaLabel = [durationAnnounced, statusString].join('. ');

  return (
    <div id={id} aria-label={ariaLabel} className="msla-pill">
      <TooltipHost content={ariaLabel}>
        <div className="msla-pill--inner">
          <span aria-hidden={true}>{duration}</span>
          <StatusIcon hasRetries={hasRetries} status={status} />
        </div>
      </TooltipHost>
    </div>
  );
};
