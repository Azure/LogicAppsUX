import { useScopeFailedRepetitions, type AppDispatch } from '../../../core';
import { useActionMetadata, useNodeMetadata, useRunInstance } from '../../../core/state/workflow/workflowSelectors';
import { setRunIndex } from '../../../core/state/workflow/workflowSlice';
import { getLoopsCount } from './helper';
import { FindPreviousAndNextPage, replaceWhiteSpaceWithUnderscore } from '@microsoft/logic-apps-shared';
import type { PageChangeEventArgs, PageChangeEventHandler } from '@microsoft/designer-ui';
import { Pager } from '@microsoft/designer-ui';
import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

export interface LoopsPagerProps {
  metadata: any;
  scopeId: string;
  collapsed: boolean;
  focusElement?: (index: number, nodeId: string) => void;
}

export const LoopsPager = ({ metadata, scopeId, collapsed, focusElement, isFromTrigger }: LoopsPagerProps) => {
  const runInstance = useRunInstance();
  const dispatch = useDispatch<AppDispatch>();
  const actionMetadata = useActionMetadata(scopeId);
  const normalizedType = useMemo(() => actionMetadata?.type.toLowerCase(), [actionMetadata]);
  const nodeMetadata = useNodeMetadata(scopeId);
  const currentPage = useMemo(() => nodeMetadata?.runIndex ?? 0, [nodeMetadata]);
  const loopsCount = useMemo(() => (isFromTrigger ? 4 : getLoopsCount(metadata?.runData)), [isFromTrigger, metadata?.runData]);
  const { isError, isFetching, data: failedRepetitions } = useScopeFailedRepetitions(normalizedType ?? '', scopeId, runInstance?.id);

  const findPreviousAndNextFailed = useCallback(
    (page: number) => FindPreviousAndNextPage(page, failedRepetitions ?? []),
    [failedRepetitions]
  );

  const onPagerChange: PageChangeEventHandler = useCallback(
    (page: PageChangeEventArgs) => {
      const index = page.value - 1;
      dispatch(setRunIndex({ page: index, nodeId: scopeId }));
      focusElement?.(index, scopeId);
    },
    [dispatch, scopeId, focusElement]
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
      failedRepetitions && failedRepetitions.length > 0
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
