import { Divider, mergeClasses, Subtitle2, Text } from '@fluentui/react-components';
import { toFriendlyDurationString, type Run } from '@microsoft/logic-apps-shared';
import { useIntervalEffect } from '@react-hookz/web';
import { getRun } from '../../../core';
import { useMemo } from 'react';
import StatusIndicator from './statusIndicator';
import { useIntl } from 'react-intl';
import { RunPopover } from './runPopover';
import { useRunHistoryPanelStyles } from './runHistoryPanel.styles';

const RunHistoryEntry = (props: {
  run: Run;
  isSelected: boolean;
  onRunSelected: (id: string) => void;
  addFilterCallback: (filter: any) => void;
}) => {
  const { run, isSelected, onRunSelected, addFilterCallback } = props;

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

  const rootStyles = mergeClasses(styles.runEntry, isSelected && styles.runEntrySelected);

  return (
    <>
      <div onClick={() => onRunSelected(run.name)} className={rootStyles}>
        {isSelected && <div className={styles.runEntrySelectedIndicator} />}
        <div className={styles.runEntryContent}>
          <Subtitle2>{startTimeString}</Subtitle2>
          <div className={styles.runEntrySubtext}>
            <StatusIndicator status={run.properties.status} />
            {durationString && <Text> • {durationString}</Text>}
          </div>
        </div>
        <RunPopover run={run} addFilterCallback={addFilterCallback} />
      </div>
      <Divider style={{ margin: '4px 0' }} />
    </>
  );
};

export default RunHistoryEntry;
