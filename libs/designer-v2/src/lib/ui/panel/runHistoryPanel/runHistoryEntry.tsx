import { Divider, mergeClasses, tokens } from '@fluentui/react-components';
import { RunMenu } from './runMenu';
import { useRunHistoryPanelStyles } from './runHistoryPanel.styles';
import { RunHistoryEntryInfo } from './runHistoryEntryInfo';
import { useMemo } from 'react';
import { useRun } from '../../../core/queries/runs';

const RunHistoryEntry = (props: {
  runId: string;
  isSelected: boolean;
  onRunSelected: (id: string) => void;
  addFilterCallback: (filter: any) => void;
}) => {
  const { runId, isSelected, onRunSelected, addFilterCallback } = props;

  const { data: run } = useRun(runId);

  const styles = useRunHistoryPanelStyles();

  const rootStyles = mergeClasses(styles.runEntry, isSelected && styles.runEntrySelected);

  const indicatorColor = useMemo(() => {
    if (run?.properties.status === 'Succeeded') {
      return tokens.colorStatusSuccessForeground1;
    }
    if (run?.properties.status === 'Failed') {
      return tokens.colorStatusDangerForeground1;
    }
    return tokens.colorBrandForeground1;
  }, [run?.properties.status]);

  if (!run) {
    return null;
  }

  return (
    <>
      <div onClick={() => onRunSelected(run?.name ?? '')} className={rootStyles}>
        {isSelected && <div className={styles.runEntrySelectedIndicator} style={{ backgroundColor: indicatorColor }} />}
        <RunHistoryEntryInfo run={run} />
        <RunMenu run={run} addFilterCallback={addFilterCallback} />
      </div>
      <Divider style={{ margin: '4px 0' }} />
    </>
  );
};

export default RunHistoryEntry;
