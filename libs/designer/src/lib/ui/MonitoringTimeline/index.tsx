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
  setTimelineRepetitionIndex,
  updateAgenticMetadata,
} from '../../core/state/workflow/workflowSlice';
import { useMonitoringTimelineStyles } from './monitoringTimeline.styles';
import type { TimelineRepetitionWithActions } from './helpers';
import { parseRepetitions } from './helpers';
import { openPanel, setSelectedNodeId } from '../../core/state/panel/panelSlice';
import TimelineHeader from './TimelineHeader';
import TimelineButtons from './TimelineButtons';
import TimelineContent from './TimelineContent';

const MonitoringTimeline = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [transitionIndex, setTransitionIndex] = useState(-1);
  const [selectedRepetition, setSelectedRepetition] = useState<TimelineRepetitionWithActions | null>(null);
  const styles = useMonitoringTimelineStyles();
  const dispatch = useDispatch();

  const { data: repetitionData, isFetching: isFetchingRepetitions, refetch: refetchTimelineRepetitions } = useTimelineRepetitions();

  const repetitions = useMemo(() => {
    return parseRepetitions(repetitionData);
  }, [repetitionData]);

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

  useEffect(() => {
    if (transitionIndex === -1 && repetitions.size > 0 && !isFetchingRepetitions) {
      setTransitionIndex(0);
    }
  }, [transitionIndex, repetitions, isFetchingRepetitions]);

  useThrottledEffect(
    () => {
      dispatch(clearAllRepetitionRunData());
      const nodeId = selectedRepetition?.data?.properties.agentMetadata.agentName;

      if (nodeId) {
        dispatch(updateAgenticMetadata({ nodeId, scopeRepetitionRunData: { ...selectedRepetition.data?.properties } }));
        dispatch(setTimelineRepetitionIndex(transitionIndex));

        dispatch(setSelectedNodeId(nodeId));
        dispatch(openPanel({ nodeId: nodeId, panelMode: 'Operation' }));
        dispatch(setFocusNode(nodeId));
        dispatch(setRunIndex({ page: selectedRepetition.repetitionIndex, nodeId: nodeId }));
      }
    },
    [dispatch, selectedRepetition, transitionIndex],
    200
  );

  const noRepetitions = useMemo(() => repetitions.size === 0, [repetitions]);

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
