import * as React from 'react';
import { useIntl } from 'react-intl';
import { mergeClasses, Spinner, Tooltip } from '@fluentui/react-components';
import { useCardStyles } from './card.styles';
import SuccessIcon from './svgs/success.svg';
import FailureIcon from './svgs/failure.svg';
import SkipIcon from './svgs/skip.svg';

export const CardStatusBadge = ({ status, duration }: any) => {
  const styles = useCardStyles();

  const intl = useIntl();

  const statusText = React.useMemo(() => {
    switch (status) {
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
      case 'Cancelled':
        return intl.formatMessage({
          defaultMessage: 'Cancelled',
          id: 'thY2eZ',
          description: 'Indicates that the run was cancelled',
        });
      default:
        return status;
    }
  }, [status, intl]);

  const text = React.useMemo(() => `${statusText} • ${duration}`, [statusText, duration]);

  const icon = React.useMemo(() => {
    switch (status) {
      case 'Succeeded':
        return <img alt={status} src={SuccessIcon} />;
      case 'Failed':
        return <img alt={status} src={FailureIcon} />;
      case 'Cancelled':
        return <img alt={status} src={FailureIcon} />;
      case 'Skipped':
        return <img alt={status} src={SkipIcon} />;
      case 'Running':
      case 'Waiting':
      case 'Resuming':
        return <Spinner className={styles.spinner} appearance="inverted" size={'extra-tiny'} />;
      default:
        return null;
    }
  }, [status]);

  const color = React.useMemo(() => {
    console.log('#> Status', status);
    switch (status) {
      case 'Succeeded':
        return styles.badgeSuccess;
      case 'Failed':
        return styles.badgeFailure;
      case 'Running':
      case 'Waiting':
      case 'Resuming':
        return styles.badgeBrand;
      default:
        return styles.badgeNeutral;
    }
  }, [status]);

  return (
    <Tooltip relationship={'label'} content={text} positioning={'after'}>
      <div className={mergeClasses(styles.badge, color)}>{icon}</div>
    </Tooltip>
  );
};
