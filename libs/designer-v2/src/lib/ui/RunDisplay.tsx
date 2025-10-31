import { Button, makeStyles, tokens } from '@fluentui/react-components';
import { setRunHistoryCollapsed } from '../core/state/panel/panelSlice';
import { useRunInstance } from '../core/state/workflow/workflowSelectors';
import { RunHistoryEntryInfo } from './panel';
import { useIsRunHistoryCollapsed } from '../core/state/panel/panelSelectors';
import { useDispatch } from 'react-redux';

import { bundleIcon, ChevronDoubleRightFilled, ChevronDoubleRightRegular } from '@fluentui/react-icons';
const ExpandIcon = bundleIcon(ChevronDoubleRightFilled, ChevronDoubleRightRegular);

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

  if (!selectedRun && !isRunHistoryCollapsed) {
    return null;
  }

  return (
    <div className={styles.root}>
      {isRunHistoryCollapsed ? (
        <Button
          onClick={() => dispatch(setRunHistoryCollapsed(false))}
          icon={<ExpandIcon />}
          size="large"
          style={{
            border: 'none',
            boxShadow: tokens.shadow8,
            height: '48px',
          }}
        />
      ) : null}
      {selectedRun ? <RunHistoryEntryInfo run={selectedRun as any} /> : null}
    </div>
  );
};
