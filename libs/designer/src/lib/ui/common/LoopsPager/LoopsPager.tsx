import constants from '../../../common/constants';
import type { AppDispatch } from '../../../core';
import { useActionMetadata, useRunInstance } from '../../../core/state/workflow/workflowSelectors';
import { setRunIndex } from '../../../core/state/workflow/workflowSlice';
import { getForeachItemsCount } from './helper';
import { RunService } from '@microsoft/designer-client-services-logic-apps';
import type { PageChangeEventArgs, PageChangeEventHandler } from '@microsoft/designer-ui';
import { Pager } from '@microsoft/designer-ui';
import { isNullOrUndefined, type LogicAppsV2 } from '@microsoft/utils-logic-apps';
import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useDispatch } from 'react-redux';

export interface LoopsPagerProps {
  metadata: any;
  scopeId: string;
  collapsed: boolean;
}

export const LoopsPager = ({ metadata, scopeId, collapsed }: LoopsPagerProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [failedRepetitions, setFailedRepetitions] = useState<Array<number>>([]);
  const runInstance = useRunInstance();
  const dispatch = useDispatch<AppDispatch>();
  const node = useActionMetadata(scopeId);
  const normalizedType = node?.type.toLowerCase();

  const forEachItemsCount = getForeachItemsCount(metadata?.runData);

  const getFailedRunScopeRepetitions = () => {
    return RunService().getScopeRepetitions({ nodeId: scopeId, runId: runInstance?.id }, constants.FLOW_STATUS.FAILED);
  };

  const onRunRepetitionsSuccess = async (repetitionValues: { value: Array<LogicAppsV2.RunRepetition> }) => {
    const { value } = repetitionValues;
    const sortedFailedRepetitions: Array<number> = value
      .reduce((acc: Array<number>, current: LogicAppsV2.RunRepetition) => {
        const scopeObject = current.properties?.repetitionIndexes?.find((item) => item.scopeName === scopeId);
        const indexOfFail = isNullOrUndefined(scopeObject) ? undefined : scopeObject.itemIndex;
        return [...acc, indexOfFail ?? []];
      }, [])
      .sort();

    setFailedRepetitions(sortedFailedRepetitions);
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
  }, [runInstance?.id, refetch, scopeId, normalizedType, metadata?.runData]);

  if (!forEachItemsCount || isError || collapsed) {
    return null;
  }

  const onPagerChange: PageChangeEventHandler = (page: PageChangeEventArgs) => {
    dispatch(setRunIndex({ page: page.value - 1, nodeId: scopeId }));
    setCurrentPage(page.value);
  };

  const onClickNextFailed: PageChangeEventHandler = (page: PageChangeEventArgs) => {
    let nextFailedRepetition = -1;
    if (failedRepetitions.includes(page.value - 1)) {
      nextFailedRepetition = page.value - 1;
    } else if (page.value - 1 < failedRepetitions[0]) {
      nextFailedRepetition = failedRepetitions[0];
    }
    dispatch(setRunIndex({ page: nextFailedRepetition, nodeId: scopeId }));
    setCurrentPage(nextFailedRepetition + 1);
  };

  const onClickPreviousFailed: PageChangeEventHandler = (page: PageChangeEventArgs) => {
    let prevFailedRepetition = -1;
    if (failedRepetitions.includes(page.value - 1)) {
      prevFailedRepetition = page.value - 1;
    } else if (page.value - 1 > failedRepetitions[failedRepetitions.length - 1]) {
      prevFailedRepetition = failedRepetitions[failedRepetitions.length - 1];
    }
    dispatch(setRunIndex({ page: prevFailedRepetition, nodeId: scopeId }));
    setCurrentPage(prevFailedRepetition + 1);
  };

  if (currentPage > forEachItemsCount) {
    onPagerChange({ value: forEachItemsCount });
  }

  const failedIterationProps =
    failedRepetitions.length > 0
      ? {
          max: failedRepetitions[failedRepetitions.length - 1] + 1,
          min: failedRepetitions[0] + 1,
          onClickNext: onClickNextFailed,
          onClickPrevious: onClickPreviousFailed,
        }
      : undefined;

  return isLoading ? null : (
    <Pager
      current={currentPage}
      onChange={onPagerChange}
      max={forEachItemsCount}
      maxLength={forEachItemsCount.toString().length + 1}
      min={1}
      readonlyPagerInput={false}
      failedIterationProps={failedIterationProps}
    />
  );
};
