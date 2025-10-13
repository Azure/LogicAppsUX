import { Button, makeStyles } from '@fluentui/react-components';
import { setRunHistoryCollapsed } from '../core/state/panel/panelSlice';
import { useRunInstance } from '../core/state/workflow/workflowSelectors';
import { RunHistoryEntryInfo } from './panel';
import { useIsRunHistoryCollapsed } from '../core/state/panel/panelSelectors';
import { useDispatch } from 'react-redux';

import { bundleIcon, TaskListLtrFilled, TaskListLtrRegular } from '@fluentui/react-icons';
const HistoryIcon = bundleIcon(TaskListLtrFilled, TaskListLtrRegular);

const useRunDisplayStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    position: 'absolute',
    top: '16px',
    left: '16px',
    zIndex: 999,
  },
});

export const RunDisplay = () => {
  const dispatch = useDispatch();

  const selectedRun = useRunInstance();

  const isRunHistoryCollapsed = useIsRunHistoryCollapsed();

  const styles = useRunDisplayStyles();

  if (!selectedRun) {
    return null;
  }

  return (
    <div className={styles.root}>
      {isRunHistoryCollapsed ? (
        <Button
          appearance="outline"
          onClick={() => dispatch(setRunHistoryCollapsed(false))}
          icon={<HistoryIcon />}
          size="large"
          style={{ height: '48px' }}
        />
      ) : null}
      <RunHistoryEntryInfo run={selectedRun as any} />
    </div>
  );
};
