import { Button, Text } from '@fluentui/react-components';
import { useMemo, useState } from 'react';
import { useMonitoringTimelineStyles } from './monitoringTimeline.styles';
import type { TimelineRepetitionWithActions } from './helpers';
import { bundleIcon, ChevronDown24Filled, ChevronDown24Regular, ChevronRight24Filled, ChevronRight24Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import TimelineNode from './TimelineNode';

const ExpandIcon = bundleIcon(ChevronRight24Filled, ChevronRight24Regular);
const CollapseIcon = bundleIcon(ChevronDown24Filled, ChevronDown24Regular);

interface TimelineGroupProps {
  isTimelineExpanded: boolean;
  taskId: number;
  repetitions: TimelineRepetitionWithActions[];
  transitionIndex: number;
  setTransitionIndex: (index: number) => void;
}

const TimelineGroup = ({ isTimelineExpanded, taskId, repetitions, transitionIndex, setTransitionIndex }: TimelineGroupProps) => {
  const [isGroupExpanded, setIsGroupExpanded] = useState(false);
  const styles = useMonitoringTimelineStyles();

  const intl = useIntl();

  const handleToggleExpand = (): void => {
    setIsGroupExpanded(!isGroupExpanded);
  };

  const text = useMemo(
    () => ({
      taskCount: (count: number) =>
        intl.formatMessage(
          {
            defaultMessage: 'Task #{count}',
            id: 'wbjWVF',
            description: 'Text displaying the task number.',
          },
          { count }
        ),
    }),
    [intl]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {isTimelineExpanded ? (
        <Button
          className={styles.timelineTask}
          appearance="subtle"
          onClick={handleToggleExpand}
          icon={isGroupExpanded ? <CollapseIcon /> : <ExpandIcon />}
          style={{ justifyContent: 'center', flexGrow: 1 }}
        >
          {isTimelineExpanded ? text.taskCount(taskId + 1) : taskId + 1}
        </Button>
      ) : (
        <Text className={styles.timelineTask} align={'center'} size={200} weight={'medium'}>
          {taskId + 1}
        </Text>
      )}

      {(repetitions ?? []).map((repetition, index) => {
        return (
          <div key={repetition.repetitionIndex} style={{ display: 'flex', flexDirection: 'column' }}>
            <TimelineNode
              index={index}
              selected={taskId === transitionIndex}
              onSelect={() => setTransitionIndex(taskId)}
              isExpanded={isTimelineExpanded}
              data={repetition.data!}
            />
          </div>
        );
      })}
    </div>
  );
};

export default TimelineGroup;
