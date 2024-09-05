import constants from '../../../common/constants';
import type { AppDispatch } from '../../../core';
import { useActionMetadata, useNodeMetadata, useRunInstance } from '../../../core/state/workflow/workflowSelectors';
import { setRunIndex } from '../../../core/state/workflow/workflowSlice';
import { getForeachItemsCount } from './helper';
import { RunService, FindPreviousAndNextPage, isNullOrUndefined, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { PageChangeEventArgs, PageChangeEventHandler } from '@microsoft/designer-ui';
import { Pager } from '@microsoft/designer-ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';

export interface LoopsPagerProps {
  metadata: any;
  scopeId: string;
  collapsed: boolean;
}

export const LoopsPager = ({ metadata, scopeId, collapsed }: LoopsPagerProps) => {
  const [failedRepetitions, setFailedRepetitions] = useState<number[]>([]);
  const runInstance = useRunInstance();
  const dispatch = useDispatch<AppDispatch>();
  const actionMetadata = useActionMetadata(scopeId);
  const normalizedType = actionMetadata?.type.toLowerCase();
  const nodeMetadata = useNodeMetadata(scopeId);
  const currentPage = useMemo(() => nodeMetadata?.runIndex ?? 0, [nodeMetadata]);

  const forEachItemsCount = getForeachItemsCount(metadata?.runData);

  const getFailedRunScopeRepetitions = () => {
    return RunService().getScopeRepetitions({ nodeId: scopeId, runId: runInstance?.id }, constants.FLOW_STATUS.FAILED);
  };

  const onRunRepetitionsSuccess = async (repetitionValues: { value: LogicAppsV2.RunRepetition[] }) => {
    const { value } = repetitionValues;
    const sortedFailedRepetitions: number[] = value
      .reduce((acc: number[], current: LogicAppsV2.RunRepetition) => {
        const scopeObject = current.properties?.repetitionIndexes?.find((item) => item.scopeName === scopeId);
        const indexOfFail = isNullOrUndefined(scopeObject) ? undefined : scopeObject.itemIndex;
        acc.push(indexOfFail ?? []);
        return acc;
      }, [])
      .sort();

    setFailedRepetitions(sortedFailedRepetitions.sort((a, b) => a - b));
  };

  const onRunRepetitionsError = async () => {
    setFailedRepetitions([]);
  };

  const { isError, refetch, isLoading } = useQuery<any>(
    ['runRepetitions', { nodeId: scopeId, runId: runInstance?.id }],
    getFailedRunScopeRepetitions,
    {
      refetchOnWindowFocus: false,
      initialData: null,
      refetchOnMount: true,
      onSuccess: onRunRepetitionsSuccess,
      onError: onRunRepetitionsError,
      enabled: normalizedType === constants.NODE.TYPE.FOREACH,
    }
  );

  useEffect(() => {
    if (normalizedType === constants.NODE.TYPE.FOREACH) {
      refetch();
    }
  }, [runInstance?.id, refetch, scopeId, normalizedType]);

  const findPreviousAndNextFailed = useCallback((page: number) => FindPreviousAndNextPage(page, failedRepetitions), [failedRepetitions]);

  if (!forEachItemsCount || isError || collapsed) {
    return null;
  }

  const onPagerChange: PageChangeEventHandler = (page: PageChangeEventArgs) => {
    dispatch(setRunIndex({ page: page.value - 1, nodeId: scopeId }));
  };

  const onClickNextFailed: PageChangeEventHandler = (page: PageChangeEventArgs) => {
    const { nextFailedRepetition } = findPreviousAndNextFailed(page.value - 1);
    dispatch(setRunIndex({ page: nextFailedRepetition, nodeId: scopeId }));
  };

  const onClickPreviousFailed: PageChangeEventHandler = (page: PageChangeEventArgs) => {
    const { prevFailedRepetition } = findPreviousAndNextFailed(page.value - 1);
    dispatch(setRunIndex({ page: prevFailedRepetition, nodeId: scopeId }));
  };

  const failedIterationProps =
    failedRepetitions.length > 0
      ? {
          max: failedRepetitions.length >= 1 ? failedRepetitions[failedRepetitions.length - 1] + 1 : 0,
          min: failedRepetitions[0] + 1 >= 1 ? failedRepetitions[0] + 1 : 1,
          onClickNext: onClickNextFailed,
          onClickPrevious: onClickPreviousFailed,
        }
      : undefined;

  return isLoading ? null : (
    <Pager
      current={currentPage + 1}
      onChange={onPagerChange}
      max={forEachItemsCount}
      maxLength={forEachItemsCount.toString().length + 1}
      min={1}
      readonlyPagerInput={false}
      failedIterationProps={failedIterationProps}
    />
  );
};
