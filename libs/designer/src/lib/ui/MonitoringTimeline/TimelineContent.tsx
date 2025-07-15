import { useMonitoringTimelineStyles } from './monitoringTimeline.styles';
import { useIntl } from 'react-intl';
import { useMemo } from 'react';
import type { TimelineRepetitionWithActions } from './helpers';
import { Slider, Spinner, Text, tokens } from '@fluentui/react-components';
import { BorderNoneRegular, CaretLeftFilled } from '@fluentui/react-icons';
import { equals } from '@microsoft/logic-apps-shared';
import TimelineGroup from './TimelineGroup';

interface TimelineContentProps {
  isExpanded: boolean;
  isFetchingRepetitions: boolean;
  noRepetitions: boolean;
  transitionIndex: number;
  repetitions: Map<number, TimelineRepetitionWithActions[]>;
  tasksNumber: number;
  selectedRepetition: TimelineRepetitionWithActions | null;
  handleSelectRepetition: (groupIndex: number, repetitionIndex: number) => void;
}

const TimelineContent = ({
  isExpanded,
  isFetchingRepetitions,
  noRepetitions,
  transitionIndex,
  repetitions,
  selectedRepetition,
  handleSelectRepetition,
  tasksNumber,
}: TimelineContentProps) => {
  const styles = useMonitoringTimelineStyles();
  const intl = useIntl();

  const text = useMemo(
    () => ({
      noData: intl.formatMessage({
        defaultMessage: 'No tasks',
        id: 'WbPW+Q',
        description: 'Text displayed when there are no transitions in the monitoring timeline.',
      }),
      loading: intl.formatMessage({
        defaultMessage: 'Loading...',
        id: 'CemHmO',
        description: 'Text displayed when the monitoring timeline is loading.',
      }),
    }),
    [intl]
  );

  if (isFetchingRepetitions) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner style={{ gap: `${isExpanded ? '8px' : '0px'}` }} size="extra-small" label={isExpanded ? text.loading : ''} />
      </div>
    );
  }

  if (noRepetitions) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: '8px',
          ...(isExpanded ? { minWidth: '200px' } : {}),
        }}
      >
        <BorderNoneRegular style={{ color: tokens.colorNeutralForeground3, width: '30px', height: '30px' }} />
        {isExpanded && (
          <Text weight={'semibold'} style={{ color: tokens.colorNeutralForeground3 }}>
            {text.noData}
          </Text>
        )}
      </div>
    );
  }

  return (
    <div className={styles.timelineMainContent}>
      <div
        className={styles.timelineNodeContainer}
        style={{
          ...(isExpanded ? { scrollbarColor: 'grey transparent' } : { scrollbarWidth: 'none' }),
        }}
      >
        {Array.from(repetitions).map(([taskId, repetitionList]) => (
          <TimelineGroup
            key={taskId}
            taskId={taskId}
            isTimelineExpanded={isExpanded}
            repetitions={repetitionList}
            transitionIndex={transitionIndex}
            selectedRepetition={selectedRepetition}
            handleSelectRepetition={handleSelectRepetition}
          />
        ))}
      </div>
      {isExpanded && (
        <>
          <Slider
            vertical
            step={1}
            value={transitionIndex}
            min={0}
            max={tasksNumber - 1}
            onChange={(e, data) => handleSelectRepetition(data.value as number, 0)}
            style={{ transform: 'rotate(180deg)' }}
          />
          <div className={styles.errorCaretContainer}>
            {Array.from(repetitions).flatMap(([_taskId, repetitionList]) =>
              repetitionList.map((repetition, _index) =>
                equals(Object.values(repetition?.data?.properties?.actions ?? {})?.[0]?.status, 'failed') ? (
                  <CaretLeftFilled key={repetition.repetitionIndex} className={styles.errorCaret} />
                ) : (
                  <div key={repetition.repetitionIndex} />
                )
              )
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TimelineContent;
