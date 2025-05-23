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
import { openPanel, setFocusNode, setSelectedNodeId, useRunChatHistory } from '../../core';
import './styles.less';
import { equals, useThrottledEffect } from '@microsoft/logic-apps-shared';
import { type TransitionRepetition, useTransitionRepetitions } from './hooks';
import { useRunInstance } from '../../core/state/workflow/workflowSelectors';
import {
  clearAllRepetitionRunData,
  setRepetitionRunData,
  setTransitionRepetitionArray,
  setTransitionRepetitionIndex,
} from '../../core/state/workflow/workflowSlice';
import type { WorkflowRunTrigger } from '@microsoft/logic-apps-shared/src/utils/src/lib/models/logicAppsV2';
import { useTheme } from '@fluentui/react';

const ChevronUpIcon = bundleIcon(ChevronUpFilled, ChevronUpRegular);
const ChevronDownIcon = bundleIcon(ChevronDownFilled, ChevronDownRegular);
const RefreshIcon = bundleIcon(ArrowClockwiseFilled, ArrowClockwiseRegular);

const TransitionTimeline = () => {
  const { isInverted } = useTheme();
  const dispatch = useDispatch();

  const runInstance = useRunInstance();
  const { data: repetitionData, isFetching: isFetchingRepetitions, refetch: refetchTransitionRepetitions } = useTransitionRepetitions();

  const { refetch: refetchChatHistory } = useRunChatHistory(true, runInstance?.id);

  const repetitions = useMemo(() => {
    if ((repetitionData ?? []).length === 0) {
      return [];
    }
    const output: {
      actionIds: string[] | undefined;
      repetitionIndex: number;
      data?: TransitionRepetition;
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
        .map((repetition) => ({
          actionIds: Object.keys(repetition.properties.actions ?? {}),
          repetitionIndex: Number(repetition.name),
          data: repetition,
        }))
        .filter((repetition) => repetition.actionIds?.length > 0)
    );
    return output;
  }, [repetitionData, runInstance?.properties?.trigger]);

  useEffect(() => {
    dispatch(setTransitionRepetitionArray((repetitions ?? []).map((repetition) => repetition.actionIds ?? [])));
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

        dispatch(setTransitionRepetitionIndex(transitionIndex));

        dispatch(setSelectedNodeId(firstNodeId));
        dispatch(openPanel({ nodeId: firstNodeId, panelMode: 'Operation' }));
        dispatch(setFocusNode(firstNodeId));
      }
    },
    [dispatch, transitionIndex],
    200
  );

  const noRepetitions = useMemo(() => (repetitions ?? []).length === 0, [repetitions]);

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
          <TimelineRegular style={{ color: '#1f85ff', width: '32px', height: '32px' }} />
          {expanded && (
            <Text weight={'semibold'} style={{ flexGrow: 1 }}>
              {'TransitionTimeline'}
            </Text>
          )}
          {expanded && (
            <Button
              appearance="subtle"
              icon={<RefreshIcon />}
              shape="circular"
              onClick={() => {
                refetchTransitionRepetitions();
                refetchChatHistory();
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
                {'No transitions'}
              </Text>
            )}
          </div>
        ) : (
          <div
            style={{
              position: 'relative',
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
                flexGrow: 1,
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
                <div
                  style={{
                    position: 'absolute',
                    top: '0px',
                    right: '-10px',
                    bottom: '0px',
                    display: 'flex',
                    flexDirection: 'column',
                    margin: '2px 0px',
                    justifyContent: 'space-between',
                  }}
                >
                  {(repetitions ?? []).map((repetition, _index) =>
                    equals(Object.values(repetition?.data?.properties?.actions ?? {})?.[0]?.status, 'failed') ? (
                      <CaretLeftFilled
                        key={repetition.repetitionIndex}
                        style={{
                          width: '16px',
                          height: '16px',
                          color: isInverted ? '#F1707B' : '#A4262C',
                        }}
                      />
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
          <div
            style={{
              position: 'absolute',
              top: '0px',
              left: '0px',
              width: '100%',
              height: '100%',
              background: isInverted ? '#1b1a19c0' : '#ffffffc0',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Spinner label={expanded ? 'Loading...' : ''} />
          </div>
        ) : null}
        <Divider />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Button
            appearance="subtle"
            icon={<ChevronUpIcon />}
            shape="circular"
            style={{ padding: '6px', justifyContent: 'flex-start' }}
            disabled={noRepetitions || transitionIndex === 0}
            onClick={() => setTransitionIndex(transitionIndex - 1)}
          >
            {expanded ? 'Previous Transition' : ''}
          </Button>
          <Button
            appearance="subtle"
            icon={<ChevronDownIcon />}
            shape="circular"
            style={{ padding: '6px', justifyContent: 'flex-start' }}
            disabled={noRepetitions || transitionIndex === repetitions.length - 1}
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
