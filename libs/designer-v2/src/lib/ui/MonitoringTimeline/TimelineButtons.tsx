import { Button } from '@fluentui/react-components';
import { useMonitoringTimelineStyles } from './monitoringTimeline.styles';
import { bundleIcon, ChevronDownFilled, ChevronDownRegular, ChevronUpFilled, ChevronUpRegular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { useMemo } from 'react';

interface TimelineButtonsProps {
  isExpanded: boolean;
  isFetchingRepetitions: boolean;
  transitionIndex: number;
  noRepetitions: boolean;
  tasksNumber: number;
  handleSelectRepetition: (groupIndex: number, repetitionIndex: number) => void;
}

const ChevronUpIcon = bundleIcon(ChevronUpFilled, ChevronUpRegular);
const ChevronDownIcon = bundleIcon(ChevronDownFilled, ChevronDownRegular);

const TimelineButtons = ({
  isExpanded,
  isFetchingRepetitions,
  transitionIndex,
  noRepetitions,
  tasksNumber,
  handleSelectRepetition,
}: TimelineButtonsProps) => {
  const styles = useMonitoringTimelineStyles();
  const intl = useIntl();

  const text = useMemo(
    () => ({
      previousTask: intl.formatMessage({
        defaultMessage: 'Previous task',
        id: 'Z9zin7',
        description: 'Text for the previous task button in the monitoring timeline.',
      }),
      nextTask: intl.formatMessage({
        defaultMessage: 'Next task',
        id: 'WtieWd',
        description: 'Text for the next task button in the monitoring timeline.',
      }),
    }),
    [intl]
  );

  return (
    <div className={styles.flexCol}>
      <Button
        appearance="subtle"
        icon={<ChevronUpIcon />}
        shape="circular"
        className={styles.navButton}
        disabled={noRepetitions || transitionIndex === 0 || isFetchingRepetitions}
        onClick={() => handleSelectRepetition(transitionIndex - 1, 0)}
      >
        {isExpanded ? text.previousTask : ''}
      </Button>
      <Button
        appearance="subtle"
        icon={<ChevronDownIcon />}
        shape="circular"
        className={styles.navButton}
        disabled={noRepetitions || transitionIndex === tasksNumber - 1 || isFetchingRepetitions}
        onClick={() => handleSelectRepetition(transitionIndex + 1, 0)}
      >
        {isExpanded ? text.nextTask : ''}
      </Button>
    </div>
  );
};

export default TimelineButtons;
