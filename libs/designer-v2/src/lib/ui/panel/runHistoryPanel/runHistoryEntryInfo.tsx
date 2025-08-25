import { Subtitle2, Caption1, Text } from '@fluentui/react-components';
import { toFriendlyDurationString, type Run } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import StatusIndicator from './statusIndicator';
import { useIntl } from 'react-intl';
import { useRunHistoryPanelStyles } from './runHistoryPanel.styles';
import { useIntervalEffect } from '@react-hookz/web';
import { getRun } from '../../../core';

export const RunHistoryEntryInfo = (props: {
  run: Run;
  showId?: boolean;
}) => {
  const { run, showId = false } = props;

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

  return (
    <div className={styles.runEntryContent}>
      <Subtitle2>{startTimeString}</Subtitle2>
      <div className={styles.runEntrySubtext}>
        <StatusIndicator status={run.properties.status} />
        {durationString && <Text> • {durationString}</Text>}
      </div>
      {showId && (
        <>
          <Caption1>{runIdLabel}</Caption1>
          <Caption1>{versionLabel}</Caption1>
        </>
      )}
    </div>
  );
};
