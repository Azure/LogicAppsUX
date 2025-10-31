import * as React from 'react';
import StatusSucceededIcon from '../../../common/images/status_success_small.svg';
import StatusFailedIcon from '../../../common/images/status_failure_small.svg';
import StatusCancelledIcon from '../../../common/images/status_cancelled_small.svg';
import StatusSkippedIcon from '../../../common/images/status_skipped_small.svg';
import { Spinner, Tooltip } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

const StatusIndicator = (props: { status: string }) => {
  const intl = useIntl();

  const text = React.useMemo(() => {
    switch (props.status) {
      case 'Succeeded':
        return intl.formatMessage({
          defaultMessage: 'Succeeded',
          id: 'B8pog+',
          description: 'Indicates that the run has succeeded',
        });
      case 'Failed':
        return intl.formatMessage({
          defaultMessage: 'Failed',
          id: '5rqV2M',
          description: 'Indicates that the run has failed',
        });
      case 'Running':
        return intl.formatMessage({
          defaultMessage: 'In progress',
          id: 'XwSnaF',
          description: 'Indicates that the run is currently in progress',
        });
      case 'Waiting':
        return intl.formatMessage({
          defaultMessage: 'Waiting',
          id: 'd0wgcV',
          description: 'Indicates that the run is currently waiting',
        });
      case 'Resuming':
        return intl.formatMessage({
          defaultMessage: 'Resuming',
          id: 'jenxD4',
          description: 'Indicates that the run is currently resuming',
        });
      case 'Cancelled':
        return intl.formatMessage({
          defaultMessage: 'Cancelled',
          id: 'thY2eZ',
          description: 'Indicates that the run was cancelled',
        });
      default:
        return props.status;
    }
  }, [props.status, intl]);

  const icon = React.useMemo(() => {
    switch (props.status) {
      case 'Succeeded':
        return <img src={StatusSucceededIcon} title={''} />;
      case 'Failed':
        return <img src={StatusFailedIcon} title={''} />;
      case 'Cancelled':
        return <img src={StatusCancelledIcon} title={''} />;
      case 'Skipped':
        return <img src={StatusSkippedIcon} title={''} />;
      case 'Running':
      case 'Waiting':
      case 'Resuming':
        return <Spinner size={'extra-tiny'} />;
      default:
        return null;
    }
  }, [props.status]);

  return (
    <Tooltip content={text} relationship="label" positioning={'above'}>
      {icon}
    </Tooltip>
  );
};

StatusIndicator.displayName = 'StatusIndicator';
export default StatusIndicator;
