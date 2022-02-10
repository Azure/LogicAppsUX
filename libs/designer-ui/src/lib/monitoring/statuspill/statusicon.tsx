import {
  getTheme,
  ISpinnerStyles,
  ITheme,
  registerOnThemeChangeCallback,
  removeOnThemeChangeCallback,
  Spinner,
  SpinnerSize,
} from '@fluentui/react';
import { useEffect, useState } from 'react';
import Constants from '../../constants';
import { Aborted } from './images/aborted';
import { Cancelled } from './images/cancelled';
import { Failed } from './images/failed';
import { Skipped } from './images/skipped';
import { Succeeded } from './images/succeeded';
import { SucceededWithRetries } from './images/succeededwithretries';
import { TimedOut } from './images/timedout';
import { Waiting } from './images/waiting';

export interface StatusIconProps {
  hasRetries: boolean;
  status: string;
}

const spinnerStyles: ISpinnerStyles = {
  root: {
    width: 24,
  },
};

export const StatusIcon: React.FC<StatusIconProps> = ({ hasRetries, status }) => {
  const [isInverted, setIsInverted] = useState(() => getTheme().isInverted);

  useEffect(() => {
    registerOnThemeChangeCallback(handleThemeChange);
    return () => {
      removeOnThemeChangeCallback(handleThemeChange);
    };
  }, []);

  const handleThemeChange = (theme: ITheme) => {
    setIsInverted(theme.isInverted);
  };

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

    // Use 1x1 transparent image for unexpected status.
    default:
      return <img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="" role="presentation" />;
  }
};
