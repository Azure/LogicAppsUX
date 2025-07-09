import { Text, Button, Card, Divider, Slider, Spinner } from '@fluentui/react-components';

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
  CaretLeftFilled,
} from '@fluentui/react-icons';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import TimelineNode from './TimelineNode';
import { openPanel, setFocusNode, setSelectedNodeId } from '../../core';
import { equals, useThrottledEffect } from '@microsoft/logic-apps-shared';
import { type TimelineRepetition, useTimelineRepetitions } from './hooks';
import { useRunInstance } from '../../core/state/workflow/workflowSelectors';
import {
  clearAllRepetitionRunData,
  setRepetitionRunData,
  setTimelineRepetitionArray,
  setTimelineRepetitionIndex,
} from '../../core/state/workflow/workflowSlice';
import type { WorkflowRunTrigger } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/logicAppsV2';
import { useMonitoringTimelineStyles } from './monitoringTimeline.styles';
import { useIntl } from 'react-intl';

const ChevronUpIcon = bundleIcon(ChevronUpFilled, ChevronUpRegular);
const ChevronDownIcon = bundleIcon(ChevronDownFilled, ChevronDownRegular);
const RefreshIcon = bundleIcon(ArrowClockwiseFilled, ArrowClockwiseRegular);

const MonitoringTimeline = () => {
  const intl = useIntl();
  const styles = useMonitoringTimelineStyles();
  const dispatch = useDispatch();

  const runInstance = useRunInstance();
  const { data: repetitionData, isFetching: isFetchingRepetitions, refetch: refetchTimelineRepetitions } = useTimelineRepetitions();

  const repetitions = useMemo(() => {
    if ((repetitionData ?? []).length === 0) {
      return [];
    }
    const output: {
      actionIds: string[] | undefined;
      repetitionIndex: number;
      data?: TimelineRepetition;
    }[] = [];
    // Add trigger (not a repetition)
    const triggerId = runInstance?.properties?.trigger?.name ?? '';
    const trigger = runInstance?.properties?.trigger as WorkflowRunTrigger;
    output.push({
      actionIds: [triggerId],
      repetitionIndex: -1,
      data: {
        id: triggerId,
        name: triggerId,
        properties: {
          actions: {
            [triggerId]: trigger,
          },
          canResubmit: trigger?.canResubmit ?? false,
          correlation: trigger?.correlation ?? '',
          startTime: trigger?.startTime ?? '',
          status: trigger?.status ?? 'Unknown',
        },
        type: 'trigger',
      },
    });
    // Add all repetitions
    output.push(
      ...(repetitionData ?? [])
        .map((repetition: any) => ({
          actionIds: Object.keys(repetition.properties.actions ?? {}),
          repetitionIndex: Number(repetition.name),
          data: repetition,
        }))
        .filter((repetition: any) => repetition.actionIds?.length > 0)
    );
    return output;
  }, [repetitionData, runInstance?.properties?.trigger]);

  useEffect(() => {
    dispatch(setTimelineRepetitionArray((repetitions ?? []).map((repetition) => repetition.actionIds ?? [])));
  }, [dispatch, repetitions]);

  const [expanded, setExpanded] = useState(false);

  const [transitionIndex, setTransitionIndex] = useState(-1);

  useEffect(() => {
    if (transitionIndex === -1 && (repetitions ?? []).length > 0 && !isFetchingRepetitions) {
      setTransitionIndex(0);
    }
  }, [transitionIndex, repetitions, isFetchingRepetitions]);

  useThrottledEffect(
    () => {
      dispatch(clearAllRepetitionRunData());

      const selectedRepetition = repetitions[transitionIndex];
      const firstNodeId = selectedRepetition?.actionIds?.[0];

      if (firstNodeId) {
        for (const a of Object.entries(selectedRepetition?.data?.properties?.actions ?? {})) {
          const [actionId, action] = a;
          dispatch(
            setRepetitionRunData({
              nodeId: actionId,
              runData: action,
            })
          );
        }

        dispatch(setTimelineRepetitionIndex(transitionIndex));

        dispatch(setSelectedNodeId(firstNodeId));
        dispatch(openPanel({ nodeId: firstNodeId, panelMode: 'Operation' }));
        dispatch(setFocusNode(firstNodeId));
      }
    },
    [dispatch, transitionIndex],
    200
  );

  const noRepetitions = useMemo(() => (repetitions ?? []).length === 0, [repetitions]);

  const text = useMemo(
    () => ({
      title: intl.formatMessage({
        defaultMessage: 'Task timeline',
        id: 'JRsTtp',
        description: 'Title for the monitoring timeline component.',
      }),
      noData: intl.formatMessage({
        defaultMessage: 'No tasks',
        id: 'WbPW+Q',
        description: 'Text displayed when there are no transitions in the monitoring timeline.',
      }),
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
      loading: intl.formatMessage({
        defaultMessage: 'Loading...',
        id: 'CemHmO',
        description: 'Text displayed when the monitoring timeline is loading.',
      }),
    }),
    [intl]
  );

  return (
    <div style={{ position: 'absolute' }}>
      <Card className={styles.monitoringTimelineRoot} onMouseOver={() => setExpanded(true)} onMouseOut={() => setExpanded(false)}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '8px',
            ...(expanded ? { minWidth: '200px' } : {}),
          }}
        >
          <TimelineRegular style={{ color: '#1f85ff', width: '32px', height: '32px' }} />
          {expanded && (
            <Text weight={'semibold'} style={{ flexGrow: 1 }}>
              {text.title}
            </Text>
          )}
          {expanded && (
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
        <Divider />
        {noRepetitions ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '8px',
              ...(expanded ? { minWidth: '200px' } : {}),
            }}
          >
            <BorderNoneRegular style={{ color: '#80808080', width: '32px', height: '32px' }} />
            {expanded && (
              <Text weight={'semibold'} style={{ color: '#80808080' }}>
                {text.noData}
              </Text>
            )}
          </div>
        ) : (
          <div className={styles.timelineMainContent}>
            <div
              className={styles.timelineNodeContainer}
              style={{
                ...(expanded ? { scrollbarColor: 'grey transparent' } : { scrollbarWidth: 'none' }),
              }}
            >
              {(repetitions ?? []).map((repetition, index) => (
                <TimelineNode
                  key={repetition.repetitionIndex}
                  index={index}
                  selected={index === transitionIndex}
                  onSelect={() => setTransitionIndex(index)}
                  expanded={expanded}
                  data={repetition.data!}
                />
              ))}
            </div>
            {expanded && (
              <>
                <Slider
                  vertical
                  step={1}
                  value={transitionIndex}
                  min={0}
                  max={repetitions.length - 1}
                  onChange={(e, data) => setTransitionIndex(data.value as number)}
                  style={{ transform: 'rotate(180deg)' }}
                />
                <div className={styles.errorCaretContainer}>
                  {(repetitions ?? []).map((repetition, _index) =>
                    equals(Object.values(repetition?.data?.properties?.actions ?? {})?.[0]?.status, 'failed') ? (
                      <CaretLeftFilled key={repetition.repetitionIndex} className={styles.errorCaret} />
                    ) : (
                      <div key={repetition.repetitionIndex} />
                    )
                  )}
                </div>
              </>
            )}
          </div>
        )}
        {isFetchingRepetitions ? (
          <div className={styles.loadingContainer}>
            <Spinner label={expanded ? text.loading : ''} />
          </div>
        ) : null}
        <Divider />
        <div className={styles.flexCol}>
          <Button
            appearance="subtle"
            icon={<ChevronUpIcon />}
            shape="circular"
            className={styles.navButton}
            disabled={noRepetitions || transitionIndex === 0}
            onClick={() => setTransitionIndex(transitionIndex - 1)}
          >
            {expanded ? text.previousTask : ''}
          </Button>
          <Button
            appearance="subtle"
            icon={<ChevronDownIcon />}
            shape="circular"
            className={styles.navButton}
            disabled={noRepetitions || transitionIndex === repetitions.length - 1}
            onClick={() => setTransitionIndex(transitionIndex + 1)}
          >
            {expanded ? text.nextTask : ''}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default MonitoringTimeline;
