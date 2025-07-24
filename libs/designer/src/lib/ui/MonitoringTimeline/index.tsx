import { Card, Divider } from '@fluentui/react-components';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useThrottledEffect } from '@microsoft/logic-apps-shared';
import { useTimelineRepetitions } from './hooks';
import {
  clearAllRepetitionRunData,
  setFocusNode,
  setRunIndex,
  setTimelineRepetitionArray,
  updateAgenticMetadata,
} from '../../core/state/workflow/workflowSlice';
import { useMonitoringTimelineStyles } from './monitoringTimeline.styles';
import type { TimelineRepetitionWithActions } from './helpers';
import { parseRepetitions } from './helpers';
import { openPanel, setSelectedNodeId } from '../../core/state/panel/panelSlice';
import TimelineHeader from './TimelineHeader';
import TimelineButtons from './TimelineButtons';
import TimelineContent from './TimelineContent';
import { useTimelineRepetitionIndex } from '../../core/state/workflow/workflowSelectors';

const MonitoringTimeline = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [transitionIndex, setTransitionIndex] = useState(-1);
  const [selectedRepetition, setSelectedRepetition] = useState<TimelineRepetitionWithActions | null>(null);
  const styles = useMonitoringTimelineStyles();
  const dispatch = useDispatch();
  const timelineRepetitionIndex = useTimelineRepetitionIndex();
  const { data: repetitionData, isFetching: isFetchingRepetitions, refetch: refetchTimelineRepetitions } = useTimelineRepetitions();

  const repetitions = useMemo(() => {
    return parseRepetitions(repetitionData);
  }, [repetitionData]);

  const flatRepetitions = useMemo(() => {
    return Array.from(repetitions).flatMap(([_taskId, repetitionList]) => repetitionList);
  }, [repetitions]);

  useEffect(() => {
    const repetitionArray = Array.from(repetitions).flatMap(([_taskId, repetitionList]) => {
      const repetitionsActions = repetitionList.map((repetition) => {
        const actionName = repetition.data?.properties.agentMetadata?.agentName;

        return actionName ? [actionName] : [];
      });
      return repetitionsActions;
    });
    dispatch(setTimelineRepetitionArray(repetitionArray));
  }, [dispatch, repetitions]);

  const handleSelectRepetition = useCallback(
    (groupIndex: number, repetitionIndex: number) => {
      const repetitionGroup = repetitions.get(groupIndex);
      if (repetitionGroup) {
        const repetition = repetitionGroup[repetitionIndex];
        if (repetition) {
          setSelectedRepetition(repetition);
          setTransitionIndex(groupIndex);
        }
      }
    },
    [repetitions]
  );

  useEffect(() => {
    if (transitionIndex === -1 && repetitions.size > 0 && !isFetchingRepetitions) {
      const repetitionGroup = repetitions.get(0);
      if (repetitionGroup && repetitionGroup.length > 0) {
        const repetition = repetitionGroup[0];
        setSelectedRepetition(repetition);
        setTransitionIndex(0);
      }
    }
  }, [transitionIndex, repetitions, isFetchingRepetitions]);

  useThrottledEffect(
    () => {
      // Access the repetition at the flat index
      if (timelineRepetitionIndex >= 0 && timelineRepetitionIndex < flatRepetitions.length) {
        // Convert flat index back to group and repetition indices
        let currentIndex = 0;
        for (const [groupIndex, repetitionList] of repetitions) {
          if (timelineRepetitionIndex >= currentIndex && timelineRepetitionIndex < currentIndex + repetitionList.length) {
            const repetitionIndex = timelineRepetitionIndex - currentIndex;
            handleSelectRepetition(groupIndex, repetitionIndex);
            break;
          }
          currentIndex += repetitionList.length;
        }
      }
    },
    [timelineRepetitionIndex, handleSelectRepetition],
    200
  );

  useThrottledEffect(
    () => {
      dispatch(clearAllRepetitionRunData());
      const nodeId = selectedRepetition?.data?.properties.agentMetadata.agentName;

      if (nodeId) {
        dispatch(updateAgenticMetadata({ nodeId, scopeRepetitionRunData: { ...selectedRepetition.data?.properties } }));

        dispatch(setSelectedNodeId(nodeId));
        dispatch(openPanel({ nodeId: nodeId, panelMode: 'Operation' }));
        dispatch(setFocusNode(nodeId));
        dispatch(setRunIndex({ page: selectedRepetition.repetitionIndex, nodeId: nodeId }));
      }
    },
    [dispatch, selectedRepetition],
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
          tasksNumber={repetitions.size}
          selectedRepetition={selectedRepetition}
          handleSelectRepetition={handleSelectRepetition}
        />
        <Divider />
        <TimelineButtons
          tasksNumber={repetitions.size}
          isFetchingRepetitions={isFetchingRepetitions}
          isExpanded={isExpanded}
          transitionIndex={transitionIndex}
          noRepetitions={noRepetitions}
          handleSelectRepetition={handleSelectRepetition}
        />
      </Card>
    </div>
  );
};

export default MonitoringTimeline;
