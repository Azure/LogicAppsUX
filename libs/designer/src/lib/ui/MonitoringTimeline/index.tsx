import { Text, Button, Card, Divider, Slider, Spinner, tokens } from '@fluentui/react-components';
import {
  bundleIcon,
  ChevronUpFilled,
  ChevronUpRegular,
  ChevronDownRegular,
  ChevronDownFilled,
  TimelineRegular,
  BorderNoneRegular,
  ArrowClockwiseFilled,
  ArrowClockwiseRegular,
} from '@fluentui/react-icons';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useThrottledEffect } from '@microsoft/logic-apps-shared';
import { useTimelineRepetitions } from './hooks';
import { useRunInstance } from '../../core/state/workflow/workflowSelectors';
import { clearAllRepetitionRunData } from '../../core/state/workflow/workflowSlice';
import { useMonitoringTimelineStyles } from './monitoringTimeline.styles';
import { useIntl } from 'react-intl';
import type { TimelineRepetitionWithActions } from './helpers';
import { parseRepetitions } from './helpers';
import TimelineGroup from './TimelineGroup';

const ChevronUpIcon = bundleIcon(ChevronUpFilled, ChevronUpRegular);
const ChevronDownIcon = bundleIcon(ChevronDownFilled, ChevronDownRegular);
const RefreshIcon = bundleIcon(ArrowClockwiseFilled, ArrowClockwiseRegular);

const MonitoringTimeline = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [transitionIndex, setTransitionIndex] = useState(-1);
  const styles = useMonitoringTimelineStyles();
  const dispatch = useDispatch();
  const runInstance = useRunInstance();

  const { data: repetitionData, isFetching: isFetchingRepetitions, refetch: refetchTimelineRepetitions } = useTimelineRepetitions();

  const repetitions = useMemo(() => {
    return parseRepetitions(repetitionData, runInstance);
  }, [repetitionData, runInstance]);

  useEffect(() => {
    // dispatch(setTimelineRepetitionArray((repetitions ).map((repetition) => repetition.actionIds ?? [])));
  }, [dispatch, repetitions]);

  useEffect(() => {
    if (transitionIndex === -1 && repetitions.size > 0 && !isFetchingRepetitions) {
      setTransitionIndex(0);
    }
  }, [transitionIndex, repetitions, isFetchingRepetitions]);

  useThrottledEffect(
    () => {
      dispatch(clearAllRepetitionRunData());

      // const selectedRepetition = repetitions.find((repetition) => repetition.data?.properties?.a2ametadata?.taskId === transitionIndex);
      // const firstNodeId = selectedRepetition?.actionIds?.[0];

      // if (firstNodeId) {
      //   for (const a of Object.entries(selectedRepetition?.data?.properties?.actions ?? {})) {
      //     const [actionId, action] = a;
      //     dispatch(
      //       setRepetitionRunData({
      //         nodeId: actionId,
      //         runData: action,
      //       })
      //     );
      //   }

      //   dispatch(setTimelineRepetitionIndex(transitionIndex));

      //   dispatch(setSelectedNodeId(firstNodeId));
      //   dispatch(openPanel({ nodeId: firstNodeId, panelMode: 'Operation' }));
      //   dispatch(setFocusNode(firstNodeId));
      // }
    },
    [dispatch, transitionIndex],
    200
  );

  const noRepetitions = useMemo(() => repetitions.size === 0, [repetitions]);

  return (
    <div style={{ position: 'absolute' }}>
      <Card className={styles.monitoringTimelineRoot} onMouseOver={() => setIsExpanded(true)} onMouseOut={() => setIsExpanded(false)}>
        <TimelineHeader isExpanded={isExpanded} refetchTimelineRepetitions={refetchTimelineRepetitions} />
        <Divider />
        <TimelineContent
          isExpanded={isExpanded}
          isFetchingRepetitions={isFetchingRepetitions}
          noRepetitions={noRepetitions}
          transitionIndex={transitionIndex}
          repetitions={repetitions}
          setTransitionIndex={setTransitionIndex}
          tasksNumber={repetitions.size}
        />
        <Divider />
        <TimelineButtons
          tasksNumber={repetitions.size}
          isFetchingRepetitions={isFetchingRepetitions}
          isExpanded={isExpanded}
          transitionIndex={transitionIndex}
          setTransitionIndex={setTransitionIndex}
          noRepetitions={noRepetitions}
        />
      </Card>
    </div>
  );
};

const TimelineContent = ({
  isExpanded,
  isFetchingRepetitions,
  noRepetitions,
  transitionIndex,
  repetitions,
  setTransitionIndex,
  tasksNumber,
}: {
  isExpanded: boolean;
  isFetchingRepetitions: boolean;
  noRepetitions: boolean;
  transitionIndex: number;
  repetitions: Map<number, TimelineRepetitionWithActions[]>;
  setTransitionIndex: (index: number) => void;
  tasksNumber: number;
}) => {
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
        {Array.from(repetitions).map(([taskId, repetitionList]) => {
          return (
            <TimelineGroup
              key={taskId}
              taskId={taskId}
              isTimelineExpanded={isExpanded}
              repetitions={repetitionList}
              transitionIndex={transitionIndex}
              setTransitionIndex={setTransitionIndex}
            />
          );
        })}
      </div>
      {isExpanded && (
        <>
          <Slider
            vertical
            step={1}
            value={transitionIndex}
            min={0}
            max={tasksNumber - 1}
            onChange={(e, data) => setTransitionIndex(data.value as number)}
            style={{ transform: 'rotate(180deg)' }}
          />
          <div className={styles.errorCaretContainer}>
            {/* {(repetitions ?? []).map((repetition, _index) =>
              equals(Object.values(repetition?.data?.properties?.actions ?? {})?.[0]?.status, 'failed') ? (
                <CaretLeftFilled key={repetition.repetitionIndex} className={styles.errorCaret} />
              ) : (
                <div key={repetition.repetitionIndex} />
              )
            )} */}
          </div>
        </>
      )}
    </div>
  );
};

const TimelineHeader = ({
  isExpanded,
  refetchTimelineRepetitions,
}: {
  isExpanded: boolean;
  refetchTimelineRepetitions: () => void;
}) => {
  const intl = useIntl();
  const styles = useMonitoringTimelineStyles();

  const text = useMemo(
    () => ({
      title: intl.formatMessage({
        defaultMessage: 'Task timeline',
        id: 'JRsTtp',
        description: 'Title for the monitoring timeline component.',
      }),
    }),
    [intl]
  );

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
      <TimelineRegular className={styles.timelineIcon} />
      {isExpanded && (
        <Text weight={'semibold'} style={{ flexGrow: 1 }}>
          {text.title}
        </Text>
      )}
      {isExpanded && (
        <Button
          appearance="subtle"
          icon={<RefreshIcon />}
          shape="circular"
          onClick={() => {
            refetchTimelineRepetitions();
            // refetchChatHistory(); // TODO: Refetch the workflow level chat history
          }}
        />
      )}
    </div>
  );
};

const TimelineButtons = ({
  isExpanded,
  isFetchingRepetitions,
  transitionIndex,
  setTransitionIndex,
  noRepetitions,
  tasksNumber,
}: {
  isExpanded: boolean;
  isFetchingRepetitions: boolean;
  transitionIndex: number;
  setTransitionIndex: (index: number) => void;
  noRepetitions: boolean;
  tasksNumber: number;
}) => {
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
        onClick={() => setTransitionIndex(transitionIndex - 1)}
      >
        {isExpanded ? text.previousTask : ''}
      </Button>
      <Button
        appearance="subtle"
        icon={<ChevronDownIcon />}
        shape="circular"
        className={styles.navButton}
        disabled={noRepetitions || transitionIndex === tasksNumber - 1 || isFetchingRepetitions}
        onClick={() => setTransitionIndex(transitionIndex + 1)}
      >
        {isExpanded ? text.nextTask : ''}
      </Button>
    </div>
  );
};

export default MonitoringTimeline;
