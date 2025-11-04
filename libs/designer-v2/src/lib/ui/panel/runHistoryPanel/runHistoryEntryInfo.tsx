import { Subtitle2, Caption1Strong, Text, Badge, Tag, Tooltip } from '@fluentui/react-components';
import { equals, toFriendlyDurationString, type Run } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import StatusIndicator from './statusIndicator';
import { useIntl } from 'react-intl';
import { useRunHistoryPanelStyles } from './runHistoryPanel.styles';
import { useIntervalEffect } from '@react-hookz/web';
import { getRun } from '../../../core';

import { ArrowRedoFilled as RetryIcon, FlashFilled as DraftIcon } from '@fluentui/react-icons';

export const RunHistoryEntryInfo = (props: {
  run: Run;
  showId?: boolean;
  showVersion?: boolean;
  size?: 'small' | 'medium';
}) => {
  const { run, showId = false, showVersion = false, size = 'medium' } = props;

  const intl = useIntl();

  const styles = useRunHistoryPanelStyles();

  // If the run is incomplete, refresh it every 10s
  const isRunIncomplete = useMemo(
    () => run.properties.status === 'Running' || run.properties.status === 'Waiting' || run.properties.status === 'Resuming',
    [run.properties.status]
  );
  useIntervalEffect(
    () => {
      getRun(run.id);
    },
    isRunIncomplete ? 1000 * 10 : undefined
  );

  const startTimeString = useMemo(() => {
    const date = Date.parse(run.properties.startTime);
    return intl.formatDate(date, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
  }, [intl, run.properties.startTime]);

  const durationString = useMemo(() => {
    if (!run.properties.startTime || !run.properties.endTime) {
      return undefined;
    }
    const start = new Date(run.properties.startTime);
    const end = new Date(run.properties.endTime);
    return toFriendlyDurationString(start, end, intl);
  }, [intl, run.properties.endTime, run.properties.startTime]);

  const runIdLabel = intl.formatMessage(
    {
      defaultMessage: 'Run ID: {id}',
      id: 'FUXlzD',
      description: 'Label for the run ID',
    },
    {
      id: run.name,
    }
  );

  const versionLabel = intl.formatMessage(
    {
      defaultMessage: 'Version: {version}',
      id: 'yUNdJN',
      description: 'Label for the run version',
    },
    {
      version: (run.properties.workflow as any)?.name ?? '',
    }
  );

  const retryText = intl.formatMessage({
    defaultMessage: 'Resubmission',
    id: 'FFpPcf',
    description: 'Text for retry run badge',
  });

  const draftText = intl.formatMessage({
    defaultMessage: 'Draft',
    id: '+RrvZW',
    description: 'Text for draft run badge',
  });

  const isRetry = !!run.properties?.previousRunId;
  const isDraftRun = equals((run.properties?.workflow as any)?.mode, 'Draft');

  if (size === 'small') {
    return (
      <div className={styles.runEntryContentSmall}>
        <StatusIndicator status={run.properties.status} onlyIcon />
        <Caption1Strong>{startTimeString}</Caption1Strong>
        {isRetry && (
					<Tooltip content={retryText} relationship='label'>
						<Badge icon={<RetryIcon />} size="medium" shape="rounded" color="severe" appearance="tint" />
					</Tooltip>
        )}
        {isDraftRun && (
					<Tooltip content={draftText} relationship='label'>
						<Badge icon={<DraftIcon />} size="medium" shape="rounded" color="brand" appearance="tint" />
					</Tooltip>
        )}
        <div style={{ flexGrow: 1 }} />
        {durationString && (
          <Badge size="small" color="informative" appearance="ghost">
            {durationString}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={styles.runEntryContent}>
      <div className={styles.runEntrySubtext}>
        <Subtitle2>{startTimeString}</Subtitle2>
        {isRetry && (
          <Badge icon={<RetryIcon />} size="medium" color="severe" appearance="ghost">
            {retryText}
          </Badge>
        )}
        {isDraftRun && (
          <Badge icon={<DraftIcon />} size="medium" color="brand" appearance="ghost">
            {draftText}
          </Badge>
        )}
      </div>
      <div className={styles.runEntrySubtext}>
        <StatusIndicator status={run.properties.status} />
        {durationString && <Text> • {durationString}</Text>}
      </div>
      {showId && (
        <Tag size="small" color="informative">
          {runIdLabel}
        </Tag>
      )}
      {showVersion && (
        <Tag size="small" color="informative">
          {versionLabel}
        </Tag>
      )}
    </div>
  );
};
