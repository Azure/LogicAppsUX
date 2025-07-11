import { Button, Text } from '@fluentui/react-components';
import { useEffect, useMemo, useState } from 'react';
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
  handleSelectRepetition: (groupIndex: number, repetitionIndex: number) => void;
}

const TimelineGroup = ({ isTimelineExpanded, taskId, repetitions, transitionIndex, handleSelectRepetition }: TimelineGroupProps) => {
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

  useEffect(() => {
    if (taskId === transitionIndex) {
      setIsGroupExpanded(true);
    }
  }, [transitionIndex, taskId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {isTimelineExpanded ? (
        <Button
          className={styles.timelineTask}
          appearance="subtle"
          size="small"
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

      {isGroupExpanded &&
        repetitions.map((repetition, index) => {
          return (
            <div key={repetition.repetitionIndex} style={{ margin: '3px' }}>
              <TimelineNode
                index={index}
                selected={false}
                onSelect={() => handleSelectRepetition(taskId, index)}
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
