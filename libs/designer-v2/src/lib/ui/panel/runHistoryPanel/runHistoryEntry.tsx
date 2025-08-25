import { Divider, mergeClasses } from '@fluentui/react-components';
import type { Run } from '@microsoft/logic-apps-shared';
import { RunPopover } from './runPopover';
import { useRunHistoryPanelStyles } from './runHistoryPanel.styles';
import { RunHistoryEntryInfo } from './runHistoryEntryInfo';

const RunHistoryEntry = (props: {
  run: Run;
  isSelected: boolean;
  onRunSelected: (id: string) => void;
  addFilterCallback: (filter: any) => void;
}) => {
  const { run, isSelected, onRunSelected, addFilterCallback } = props;

  const styles = useRunHistoryPanelStyles();

  const rootStyles = mergeClasses(styles.runEntry, isSelected && styles.runEntrySelected);

  return (
    <>
      <div onClick={() => onRunSelected(run.name)} className={rootStyles}>
        {isSelected && <div className={styles.runEntrySelectedIndicator} />}
        <RunHistoryEntryInfo run={run} />
        <RunPopover run={run} addFilterCallback={addFilterCallback} />
      </div>
      <Divider style={{ margin: '4px 0' }} />
    </>
  );
};

export default RunHistoryEntry;
