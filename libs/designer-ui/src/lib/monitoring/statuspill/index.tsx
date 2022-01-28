import { ISpinnerStyles, Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { getTheme, ITheme, registerOnThemeChangeCallback, removeOnThemeChangeCallback } from '@fluentui/react/lib/Styling';
import { ITooltipHostStyles, TooltipHost } from '@fluentui/react/lib/Tooltip';
import * as React from 'react';

import Constants from '../../constants';
import { getStatusString } from '../../utils/utils';
import { Aborted } from './images/aborted';
import { Cancelled } from './images/cancelled';
import { Failed } from './images/failed';
import { Skipped } from './images/skipped';
import { Succeeded } from './images/succeeded';
import { SucceededWithRetries } from './images/succeededwithretries';
import { TimedOut } from './images/timedout';
import { Waiting } from './images/waiting';

export interface StatusPillProps {
  duration?: string;
  durationAnnounced?: string;
  hasRetries?: boolean;
  id?: string;
  status: string;
}

interface StatusIconProps {
  hasRetries: boolean;
  status: string;
}

const spinnerStyles: ISpinnerStyles = {
  root: {
    width: 24,
  },
};

const tooltipHostStyles: ITooltipHostStyles = {
  root: {
    display: 'inline-block',
  },
};

export function StatusPill({ duration, durationAnnounced, hasRetries = false, id, status }: StatusPillProps): JSX.Element {
  const statusString = getStatusString(status, hasRetries);

  if (!duration || duration === '--') {
    return (
      <div id={id} aria-label={statusString} className="msla-pill status-only">
        <TooltipHost content={statusString} styles={tooltipHostStyles}>
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
      <TooltipHost content={ariaLabel} styles={tooltipHostStyles}>
        <div className="msla-pill--inner">
          <span aria-hidden={true}>{duration}</span>
          <StatusIcon hasRetries={hasRetries} status={status} />
        </div>
      </TooltipHost>
    </div>
  );
}

function StatusIcon({ hasRetries, status }: StatusIconProps): JSX.Element {
  function handleThemeChange(theme: ITheme) {
    setIsInverted(theme.isInverted);
  }

  const [isInverted, setIsInverted] = React.useState(() => getTheme().isInverted);

  React.useEffect(() => {
    registerOnThemeChangeCallback(handleThemeChange);
    return () => {
      removeOnThemeChangeCallback(handleThemeChange);
    };
  }, []);

  if (status === Constants.STATUS.RUNNING) {
    return <Spinner size={SpinnerSize.medium} styles={spinnerStyles} />;
  }

  switch (status) {
    case Constants.STATUS.ABORTED:
      return <Aborted isInverted={isInverted} />;

    case Constants.STATUS.CANCELLED:
      return <Cancelled isInverted={isInverted} />;

    case Constants.STATUS.FAILED:
      return <Failed isInverted={isInverted} />;

    case Constants.STATUS.SKIPPED:
      return <Skipped isInverted={isInverted} />;

    case Constants.STATUS.SUCCEEDED:
      return hasRetries ? <SucceededWithRetries isInverted={isInverted} /> : <Succeeded isInverted={isInverted} />;

    case Constants.STATUS.TIMEDOUT:
      return <TimedOut isInverted={isInverted} />;

    case Constants.STATUS.WAITING:
      return <Waiting isInverted={isInverted} />;

    // NOTE(joechung): Use 1x1 transparent image for unexpected status.
    default:
      return <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="" role="presentation" />;
  }
}
