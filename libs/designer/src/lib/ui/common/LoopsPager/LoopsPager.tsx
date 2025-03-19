import constants from '../../../common/constants';
import type { AppDispatch } from '../../../core';
import { useActionMetadata, useNodeMetadata, useRunInstance } from '../../../core/state/workflow/workflowSelectors';
import { setRunIndex } from '../../../core/state/workflow/workflowSlice';
import { getLoopsCount } from './helper';
import {
  RunService,
  FindPreviousAndNextPage,
  isNullOrUndefined,
  type LogicAppsV2,
  replaceWhiteSpaceWithUnderscore,
} from '@microsoft/logic-apps-shared';
import type { PageChangeEventArgs, PageChangeEventHandler } from '@microsoft/designer-ui';
import { Pager } from '@microsoft/designer-ui';
import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';

export interface LoopsPagerProps {
  metadata: any;
  scopeId: string;
  collapsed: boolean;
}

export const LoopsPager = ({ metadata, scopeId, collapsed }: LoopsPagerProps) => {
  const runInstance = useRunInstance();
  const dispatch = useDispatch<AppDispatch>();
  const actionMetadata = useActionMetadata(scopeId);
  const normalizedType = useMemo(() => actionMetadata?.type.toLowerCase(), [actionMetadata]);
  const nodeMetadata = useNodeMetadata(scopeId);
  const currentPage = useMemo(() => nodeMetadata?.runIndex ?? 0, [nodeMetadata]);
  const loopsCount = useMemo(() => getLoopsCount(metadata?.runData), [metadata?.runData]);

  const {
    isError,
    isFetching,
    data: failedRepetitions,
  } = useQuery<any>(
    ['runRepetitions', { nodeId: scopeId, runId: runInstance?.id }],
    async () => {
      let failedRunRepetitions: LogicAppsV2.RunRepetition[] = [];
      try {
        const { value } = await RunService().getScopeRepetitions({ nodeId: scopeId, runId: runInstance?.id }, constants.FLOW_STATUS.FAILED);
        failedRunRepetitions = value;
      } catch {
        failedRunRepetitions = [];
      }
      const _failedRepetitions: number[] = failedRunRepetitions.reduce((acc: number[], current: LogicAppsV2.RunRepetition) => {
        const scopeObject = current.properties?.repetitionIndexes?.find((item) => item.scopeName === scopeId);
        const indexOfFail = isNullOrUndefined(scopeObject) ? undefined : scopeObject.itemIndex;
        acc.push(indexOfFail ?? []);
        return acc;
      }, []);
      return _failedRepetitions.sort((a, b) => a - b);
    },
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      enabled: normalizedType === constants.NODE.TYPE.FOREACH || normalizedType === constants.NODE.TYPE.UNTIL,
    }
  );

  const findPreviousAndNextFailed = useCallback(
    (page: number) => FindPreviousAndNextPage(page, failedRepetitions ?? []),
    [failedRepetitions]
  );

  const onPagerChange: PageChangeEventHandler = useCallback(
    (page: PageChangeEventArgs) => {
      dispatch(setRunIndex({ page: page.value - 1, nodeId: scopeId }));
    },
    [dispatch, scopeId]
  );

  const onClickNextFailed: PageChangeEventHandler = useCallback(
    (page: PageChangeEventArgs) => {
      const { nextFailedRepetition } = findPreviousAndNextFailed(page.value - 1);
      dispatch(setRunIndex({ page: nextFailedRepetition, nodeId: scopeId }));
    },
    [dispatch, findPreviousAndNextFailed, scopeId]
  );

  const onClickPreviousFailed: PageChangeEventHandler = useCallback(
    (page: PageChangeEventArgs) => {
      const { prevFailedRepetition } = findPreviousAndNextFailed(page.value - 1);
      dispatch(setRunIndex({ page: prevFailedRepetition, nodeId: scopeId }));
    },
    [dispatch, findPreviousAndNextFailed, scopeId]
  );

  const failedIterationProps = useMemo(
    () =>
      (failedRepetitions ?? []).length > 0
        ? {
            max: failedRepetitions.length >= 1 ? failedRepetitions[failedRepetitions.length - 1] + 1 : 0,
            min: failedRepetitions[0] + 1 >= 1 ? failedRepetitions[0] + 1 : 1,
            onClickNext: onClickNextFailed,
            onClickPrevious: onClickPreviousFailed,
          }
        : undefined,
    [failedRepetitions, onClickNextFailed, onClickPreviousFailed]
  );

  if (!loopsCount || isError || collapsed) {
    return null;
  }

  return isFetching ? null : (
    <div data-automation-id={`msla-pager-v2-${replaceWhiteSpaceWithUnderscore(scopeId)}`}>
      <Pager
        current={currentPage + 1}
        onChange={onPagerChange}
        max={loopsCount}
        maxLength={loopsCount.toString().length + 1}
        min={1}
        readonlyPagerInput={false}
        failedIterationProps={failedIterationProps}
      />
    </div>
  );
};
