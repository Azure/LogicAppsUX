import { Text, Button, Card, Divider, Slider } from '@fluentui/react-components';

import {
  bundleIcon,
  ChevronUpFilled,
  ChevronUpRegular,
  ChevronDownRegular,
  ChevronDownFilled,
  TimelineRegular,
} from '@fluentui/react-icons';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import TimelineNode from './timelineNode';
import { openPanel, setFocusNode, setSelectedNodeId } from '../../core';
import './styles.less';
import { useThrottledEffect } from '@microsoft/logic-apps-shared';
import { type TransitionRepetition, useTransitionRepetitions } from './hooks';
import { useRunInstance } from '../../core/state/workflow/workflowSelectors';
import {
  clearAllRepetitionRunData,
  setRepetitionRunData,
  setTransitionRepetitionArray,
  setTransitionRepetitionIndex,
} from '../../core/state/workflow/workflowSlice';
import type { WorkflowRunTrigger } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/logicAppsV2';

const ChevronUpIcon = bundleIcon(ChevronUpFilled, ChevronUpRegular);
const ChevronDownIcon = bundleIcon(ChevronDownFilled, ChevronDownRegular);

const TransitionTimeline = () => {
  const dispatch = useDispatch();

  const runInstance = useRunInstance();
  const repetitionData = useTransitionRepetitions();

  const repetitions = useMemo(() => {
    const output: {
      actionId: string | undefined;
      repetitionIndex: number;
      actionCount?: number;
      data?: TransitionRepetition;
    }[] = [];
    // Add trigger (not a repetition)
    const triggerId = runInstance?.properties?.trigger?.name ?? '';
    const trigger = runInstance?.properties?.trigger as WorkflowRunTrigger;
    output.push({
      actionId: triggerId,
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
      ...repetitionData.map((repetition) => ({
        actionId: Object.keys(repetition.properties.actions)[0],
        repetitionIndex: Number(repetition.name),
        actionCount: Object.keys(repetition.properties.actions).length,
        data: repetition,
      }))
    );
    return output;
  }, [repetitionData, runInstance?.properties?.trigger]);

  useEffect(() => {
    dispatch(setTransitionRepetitionArray(repetitions.map((repetition) => repetition.actionId ?? '')));
  }, [dispatch, repetitions]);

  const [expanded, setExpanded] = useState(false);

  const [transitionIndex, setTransitionIndex] = useState(0);

  useThrottledEffect(
    () => {
      const selectedRepetition = repetitions[transitionIndex];
      const id = selectedRepetition?.actionId;
      if (id) {
        dispatch(clearAllRepetitionRunData());

        for (const a of Object.entries(selectedRepetition?.data?.properties?.actions ?? {})) {
          const [actionId, action] = a;
          dispatch(
            setRepetitionRunData({
              nodeId: actionId,
              runData: action,
            })
          );
        }

        dispatch(setTransitionRepetitionIndex(transitionIndex));

        dispatch(setSelectedNodeId(id));
        dispatch(openPanel({ nodeId: id, panelMode: 'Operation' }));
        dispatch(setFocusNode(id));
      }
    },
    [dispatch, transitionIndex],
    200
  );

  return (
    <div style={{ position: 'absolute' }}>
      <Card
        style={{ margin: '20px', borderRadius: '28px', gap: '8px' }}
        onMouseOver={() => setExpanded(true)}
        onMouseOut={() => setExpanded(false)}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '8px',
            ...(expanded ? { minWidth: '200px' } : {}),
          }}
        >
          <TimelineRegular style={{ color: '#1f85ff', width: '32px', height: '32px', transform: 'rotate(180deg)' }} />
          {expanded && <Text weight={'semibold'}>{'TransitionTimeline'}</Text>}
        </div>

        <Divider />
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '8px',
            maxHeight: '390px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              margin: '-8px',
              padding: '16px 8px',
              overflowY: 'auto',
              scrollbarWidth: 'none',
              ...(expanded ? { scrollbarColor: 'grey transparent' } : { scrollbarWidth: 'none' }),
            }}
          >
            {repetitions.map((repetition, index) => (
              <TimelineNode
                key={repetition.actionId}
                index={index}
                nodeId={repetition.actionId}
                selected={index === transitionIndex}
                onSelect={() => setTransitionIndex(index)}
                expanded={expanded}
              />
            ))}
          </div>
          {expanded && (
            <Slider
              vertical
              step={1}
              value={transitionIndex}
              min={0}
              max={repetitions.length - 1}
              onChange={(e, data) => setTransitionIndex(data.value as number)}
              style={{ transform: 'rotate(180deg)' }}
            />
          )}
        </div>
        <Divider />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Button
            appearance="subtle"
            icon={<ChevronUpIcon />}
            shape="circular"
            style={{ padding: '6px', justifyContent: 'flex-start' }}
            disabled={transitionIndex === 0}
            onClick={() => setTransitionIndex(transitionIndex - 1)}
          >
            {expanded ? 'Previous Transition' : ''}
          </Button>
          <Button
            appearance="subtle"
            icon={<ChevronDownIcon />}
            shape="circular"
            style={{ padding: '6px', justifyContent: 'flex-start' }}
            disabled={transitionIndex === repetitions.length - 1}
            onClick={() => setTransitionIndex(transitionIndex + 1)}
          >
            {expanded ? 'Next Transition' : ''}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default TransitionTimeline;
