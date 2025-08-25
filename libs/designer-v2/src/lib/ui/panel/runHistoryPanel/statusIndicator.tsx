import * as React from 'react';
import StatusSucceededIcon from '../../../../lib/common/images/status_success.svg';
import StatusFailedIcon from '../../../../lib/common/images/status_failure.svg';
import { Text, Spinner } from '@fluentui/react-components';
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
          defaultMessage: 'Running',
          id: 'Z1fLoJ',
          description: 'Indicates that the run is currently running',
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
      default:
        return null;
    }
  }, [props.status, intl]);

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

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      {icon}
      <Text>{text}</Text>
    </div>
  );
};

StatusIndicator.displayName = 'StatusIndicator';
export default StatusIndicator;
