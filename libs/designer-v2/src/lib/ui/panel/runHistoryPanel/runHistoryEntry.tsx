import { Checkbox, Divider, mergeClasses, tokens } from '@fluentui/react-components';
import { RunMenu } from './runMenu';
import { useRunHistoryPanelStyles } from './runHistoryPanel.styles';
import { RunHistoryEntryInfo } from './runHistoryEntryInfo';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRun } from '../../../core/queries/runs';

const RunHistoryEntry = (props: {
  runId: string;
  isSelected: boolean;
  onRunSelected: (id: string) => void;
  addFilterCallback: (filter: any) => void;
  size?: 'small' | 'medium';
	multiSelectVisible?: boolean;
	isMultiSelected?: boolean;
	onMultiSelectChange?: (runId: string, isSelected: boolean) => void;
}) => {
  const { 
		runId, 
		isSelected, 
		onRunSelected, 
		addFilterCallback, 
		size = 'medium',
		multiSelectVisible = false,
		isMultiSelected = false,
		onMultiSelectChange,
	} = props;

  const { data: run } = useRun(runId);

  const styles = useRunHistoryPanelStyles();

  const indicatorColor = useMemo(() => {
    if (run?.properties.status === 'Succeeded') {
      return tokens.colorStatusSuccessForeground1;
    }
    if (run?.properties.status === 'Failed') {
      return tokens.colorStatusDangerForeground1;
    }
    return tokens.colorBrandForeground1;
  }, [run?.properties.status]);

  const ref = useRef<HTMLDivElement>(null);
  // Scroll into view when selected, this is to handle navigation from other components
  useEffect(() => {
    if (isSelected) {
      ref.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'center' });
    }
  }, [isSelected]);

	// Hover state for multi-select visibility
	const [hovering, setHovering] = useState(false);

  if (!run) {
    return null;
  }

  if (size === 'small') {
    return (
      <>
        <div
          ref={ref}
          className={mergeClasses(styles.runEntry, styles.runEntrySmall, isSelected && styles.runEntrySelected)}
          onClick={() => onRunSelected(run?.name ?? '')}
					onMouseEnter={() => setHovering(true)}
					onMouseLeave={() => setHovering(false)}
        >
					{isSelected ? (
						<div className={styles.runEntrySelectedIndicator} style={{ backgroundColor: indicatorColor }} />
					) : null}
					<Checkbox
						checked={isMultiSelected}
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							onMultiSelectChange?.(runId, !isMultiSelected);
						}}
						style={hovering || multiSelectVisible || isMultiSelected ? {} : { visibility: 'hidden' }}
					/>
          <RunHistoryEntryInfo run={run} size="small" />
          <RunMenu run={run} addFilterCallback={addFilterCallback} />
        </div>
        <Divider />
      </>
    );
  }

  return (
    <>
      <div
        ref={ref}
        className={mergeClasses(styles.runEntry, isSelected && styles.runEntrySelected)}
        onClick={() => onRunSelected(run?.name ?? '')}
      >
        {isSelected && <div className={styles.runEntrySelectedIndicator} style={{ backgroundColor: indicatorColor }} />}
        <RunHistoryEntryInfo run={run} />
        <RunMenu run={run} addFilterCallback={addFilterCallback} />
      </div>
      <Divider style={{ margin: '4px 0' }} />
    </>
  );
};

export default RunHistoryEntry;
