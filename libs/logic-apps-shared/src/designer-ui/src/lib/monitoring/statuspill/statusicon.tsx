import Constants from '../../constants';
import { Aborted } from './images/aborted';
import { Cancelled } from './images/cancelled';
import { Failed } from './images/failed';
import { Skipped } from './images/skipped';
import { Succeeded } from './images/succeeded';
import { SucceededWithRetries } from './images/succeededwithretries';
import { TimedOut } from './images/timedout';
import { Waiting } from './images/waiting';
import type { ISpinnerStyles } from '@fluentui/react';
import { Spinner, SpinnerSize } from '@fluentui/react';

type IconOpacity = `${number}%`;
export interface StatusIconProps {
  hasRetries: boolean;
  status: string;
  iconOpacity?: IconOpacity;
}

const spinnerStyles: ISpinnerStyles = {
  root: {
    width: 24,
  },
};

export const StatusIcon: React.FC<StatusIconProps> = ({ hasRetries, status, iconOpacity = '100%' }) => {
  if (status === Constants.STATUS.RUNNING) {
    return <Spinner size={SpinnerSize.medium} styles={spinnerStyles} />;
  }

  switch (status) {
    case Constants.STATUS.ABORTED:
      return <Aborted />;

    case Constants.STATUS.CANCELLED:
      return <Cancelled />;

    case Constants.STATUS.FAILED:
      return <Failed />;

    case Constants.STATUS.SKIPPED:
      return <Skipped />;

    case Constants.STATUS.SUCCEEDED:
      return <div style={{ opacity: iconOpacity }}>{hasRetries ? <SucceededWithRetries /> : <Succeeded />}</div>;

    case Constants.STATUS.TIMEDOUT:
      return <TimedOut />;

    case Constants.STATUS.WAITING:
      return <Waiting />;

    // Use 1x1 transparent image for unexpected status.
    default:
      return <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="" role="presentation" />;
  }
};
