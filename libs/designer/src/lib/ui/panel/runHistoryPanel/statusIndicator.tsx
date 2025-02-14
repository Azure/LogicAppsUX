import * as React from 'react';
import StatusSucceededIcon from '../../../../lib/common/images/status_success.svg';
import StatusFailedIcon from '../../../../lib/common/images/status_failure.svg';
import { Spinner } from '@fluentui/react-components';

const StatusIndicator = (props: { status: string }) => {
  const icon = React.useMemo(() => {
    switch (props.status) {
      case 'Succeeded':
        return <img src={StatusSucceededIcon} />;
      case 'Failed':
        return <img src={StatusFailedIcon} />;
      case 'Running':
      case 'Waiting':
      case 'Resuming':
        return <Spinner size={'extra-tiny'} />;
      default:
        return null;
    }
  }, [props.status]);

  return icon;
};

StatusIndicator.displayName = 'StatusIndicator';
export default StatusIndicator;
