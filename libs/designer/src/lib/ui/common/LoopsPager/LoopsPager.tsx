import constants from '../../../common/constants';
import type { AppDispatch } from '../../../core';
import { useRunInstance } from '../../../core/state/workflow/workflowSelectors';
import { setRunIndex } from '../../../core/state/workflow/workflowSlice';
import { getForeachItemsCount } from './helper';
import { RunService } from '@microsoft/designer-client-services-logic-apps';
import type { PageChangeEventArgs, PageChangeEventHandler } from '@microsoft/designer-ui';
import { Pager } from '@microsoft/designer-ui';
import { useState } from 'react';
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

  const forEachItemsCount = getForeachItemsCount(metadata?.runData);

  const getFailedRunScopeRepetitions = () => {
    return RunService().getScopeRepetitions({ nodeId: scopeId, runId: runInstance?.id }, constants.FLOW_STATUS.FAILED);
  };

  const onRunRepetitionsSuccess = async (repetitionValues: { value: Array<LogicAppsV2.RunRepetition> }) => {
    const { value } = repetitionValues;
    const sortedFailedRepetitions: Array<number> = value
      .reduce((prev: Array<number>, current: any) => {
        const indexOfFail = current.properties.repetitionIndexes[0].itemIndex;
        return [...prev, indexOfFail];
      }, [])
      .sort();

    setFailedRepetitions(sortedFailedRepetitions);
  };

  const onRunRepetitionsError = async () => {
    setFailedRepetitions([]);
  };

  const { isError } = useQuery<any>(['runRepetitions'], getFailedRunScopeRepetitions, {
    refetchOnWindowFocus: false,
    initialData: null,
    onSuccess: onRunRepetitionsSuccess,
    onError: onRunRepetitionsError,
  });

  if (!forEachItemsCount || isError || collapsed) {
    return null;
  }

  const onPagerChange: PageChangeEventHandler = (page: PageChangeEventArgs) => {
    dispatch(setRunIndex({ page: page.value - 1, nodeId: scopeId }));
    setCurrentPage(page.value);
  };

  const failedIterationProps =
    failedRepetitions.length > 0
      ? {
          max: failedRepetitions[failedRepetitions.length - 1] + 1,
          min: failedRepetitions[0] + 1,
          onClickNext: onPagerChange,
          onClickPrevious: onPagerChange,
        }
      : undefined;

  return (
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
