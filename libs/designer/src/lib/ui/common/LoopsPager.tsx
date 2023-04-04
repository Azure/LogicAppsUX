import constants from '../../common/constants';
import type { AppDispatch } from '../../core';
import { useMonitoringView } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useRunInstance } from '../../core/state/workflow/workflowSelectors';
import { setRunIndex } from '../../core/state/workflow/workflowSlice';
import { RunService } from '@microsoft/designer-client-services-logic-apps';
import type { PageChangeEventArgs, PageChangeEventHandler } from '@microsoft/designer-ui';
import { Pager } from '@microsoft/designer-ui';
import { useState } from 'react';
import { useQuery } from 'react-query';
import { useDispatch } from 'react-redux';

export interface LoopsPagerProps {
  normalizedType: string;
  metadata: any;
  scopeId: string;
}

export const LoopsPager = ({ normalizedType, metadata, scopeId }: LoopsPagerProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [failedRepetitions, setFailedRepetitions] = useState<Array<number>>([]);
  const isMonitoringView = useMonitoringView();
  const runInstance = useRunInstance();
  const dispatch = useDispatch<AppDispatch>();

  const hasPager = (normalizedType === constants.NODE.TYPE.FOREACH || normalizedType === constants.NODE.TYPE.UNTIL) && isMonitoringView;
  const max = metadata?.runData?.inputsLink?.metadata?.foreachItemsCount ?? 5;

  const getFailedRunScopeRepetitions = () => {
    return RunService().getScopeRepetitions({ actionId: scopeId, runId: runInstance?.id }, constants.FLOW_STATUS.FAILED);
  };

  const onRunRepetitionsSuccess = async (repetitionValues: any) => {
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

  if (!hasPager || !max || isError) {
    return null;
  }

  const onPagerChange: PageChangeEventHandler = (page: PageChangeEventArgs) => {
    dispatch(setRunIndex({ page: page.value, nodeId: scopeId }));
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
      max={max}
      maxLength={max.toString().length + 1}
      min={1}
      readonlyPagerInput={false}
      failedIterationProps={failedIterationProps}
    />
  );
};
