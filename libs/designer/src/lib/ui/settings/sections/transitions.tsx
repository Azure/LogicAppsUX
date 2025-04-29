import { SettingSectionName } from '../';
import type { AppDispatch, RootState } from '../../../core';
import { useActionMetadata, useRootTriggerId } from '../../../core/state/workflow/workflowSelectors';
import { removeEdgeFromTransitions, updateTransitions } from '../../../core/state/workflow/workflowSlice';
import { validateNodeSettings } from '../validation/validation';
import { getRecordEntry, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { TransitionsActionDetails, type TransitionsActionDetailsProps } from './transitionsConfiguration';
import { TransitionsActionSelector } from './transitionsConfiguration/transitionsActionSelector';

export const Transitions = ({ nodeId = '', readOnly = false }): JSX.Element | null => {
  const nodeData = useActionMetadata(nodeId) as LogicAppsV2.ActionDefinition;
  const dispatch = useDispatch<AppDispatch>();

  const rootState = useSelector((state: RootState) => state);

  const rootTriggerId = useRootTriggerId();

  useEffect(() => {
    validateNodeSettings(nodeId, {}, SettingSectionName.RUNAFTER, rootState, dispatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, nodeData?.transitions, dispatch]);

  const handleStatusChange = useCallback(
    (targetId: string, status: string, checked?: boolean) => {
      if (!nodeData?.transitions) {
        return;
      }
      const statuses = [...(getRecordEntry(nodeData?.transitions ?? {}, targetId)?.when ?? [])];
      if (checked) {
        if (!statuses.includes(status)) {
          statuses.push(status);
        }
      } else if (statuses.includes(status)) {
        statuses.splice(statuses.indexOf(status), 1);
      }

      const oldTransitionData = nodeData.transitions?.[targetId] ?? {};

      dispatch(
        updateTransitions({
          sourceId: nodeId,
          targetId,
          transition: {
            ...oldTransitionData,
            when: statuses,
          },
        })
      );
    },
    [dispatch, nodeData.transitions, nodeId]
  );

  const getTransitionsProps = (): TransitionsActionDetailsProps[] => {
    const items: TransitionsActionDetailsProps[] = [];
    const transitionsValue = nodeData.transitions ?? {};
    const isTrigger = nodeId === rootTriggerId;
    Object.entries(transitionsValue).forEach(([targetId, value], _i) => {
      items.push({
        collapsible: true,
        expanded: false,
        sourceId: nodeId,
        targetId: targetId,
        disableDelete: false,
        disableStatusChange: isTrigger,
        readOnly: readOnly,
        transition: value,
        onStatusChange: (status, checked) => {
          handleStatusChange(targetId, status, checked);
        },
        onDelete: () => {
          dispatch(
            removeEdgeFromTransitions({
              sourceId: nodeId,
              targetId,
            })
          );
        },
      });
    });
    return items;
  };

  return (
    <div>
      <TransitionsActionSelector readOnly={readOnly} />
      {getTransitionsProps().map((item, key) => (
        <TransitionsActionDetails {...item} key={key} readOnly={readOnly} />
      ))}
    </div>
  );
};
