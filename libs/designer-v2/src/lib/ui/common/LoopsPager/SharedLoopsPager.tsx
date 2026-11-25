import { useScopeFailedRepetitions, type AppDispatch } from '../../../core';
import constants from '../../../common/constants';
import { useActionMetadata, useNodeMetadata, useParentRunIndexes, useRunInstance } from '../../../core/state/workflow/workflowSelectors';
import { setRunIndex, setToolRunIndex } from '../../../core/state/workflow/workflowSlice';
import { getLoopsCount } from './helper';
import type { LoopsPagerProps } from './LoopsPager';
import { replaceWhiteSpaceWithUnderscore } from '@microsoft/logic-apps-shared';
import { NodeIterationPager, type NodeIterationPagerStrings } from '@microsoft/designer-ui-v2';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

/**
 * Flag-on counterpart of `LoopsPager`. Run-state reads and guards intentionally mirror the legacy pager
 * so only the presentation changes; the shared pager stays pure props and the host owns dispatch.
 */
export const SharedLoopsPager = ({
  metadata,
  scopeId,
  collapsed,
  focusElement,
  useToolRun,
  inLoopCardRow,
}: LoopsPagerProps & { inLoopCardRow?: boolean }) => {
  const intl = useIntl();
  const runInstance = useRunInstance();
  const dispatch = useDispatch<AppDispatch>();
  const actionMetadata = useActionMetadata(scopeId);
  const normalizedType = useMemo(() => actionMetadata?.type.toLowerCase(), [actionMetadata]);
  const nodeMetadata = useNodeMetadata(scopeId);
  const parentRunIndexes = useParentRunIndexes(scopeId);
  const currentPage = (useToolRun ? nodeMetadata?.toolRunIndex : nodeMetadata?.runIndex) ?? 0;
  const loopsCount = getLoopsCount(useToolRun ? metadata?.toolRunData : metadata?.runData);
  // Same failure source as legacy: the query only runs for Foreach/Until scopes, so tool-run pagers (MCP)
  // currently receive no failures and show no failed jumps. A tool-specific failure source is a follow-up.
  const {
    isError,
    isFetching,
    isPreviousData,
    data: failedRepetitions,
  } = useScopeFailedRepetitions(normalizedType ?? '', scopeId, runInstance?.id);
  const isLoopScope = normalizedType === constants.NODE.TYPE.FOREACH || normalizedType === constants.NODE.TYPE.UNTIL;
  // The failure query identifies the run and loop, but not the selected iteration of a repeating parent.
  const canPickFailures = !!runInstance?.id && isLoopScope && !useToolRun && !isPreviousData && Object.keys(parentRunIndexes).length === 0;

  const strings = useMemo<NodeIterationPagerStrings>(
    () => ({
      label: intl.formatMessage({ defaultMessage: 'Iterations', id: '7fJxJr', description: 'Accessible name of the loop iteration pager' }),
      previous: intl.formatMessage({
        defaultMessage: 'Previous iteration',
        id: 'VnVsuc',
        description: 'Button to show the previous loop iteration',
      }),
      next: intl.formatMessage({ defaultMessage: 'Next iteration', id: 'ykkr+h', description: 'Button to show the next loop iteration' }),
      previousFailed: intl.formatMessage({
        defaultMessage: 'Previous failed iteration',
        id: 'sd0Ozf',
        description: 'Button to jump to the previous failed loop iteration',
      }),
      nextFailed: intl.formatMessage({
        defaultMessage: 'Next failed iteration',
        id: 'jJPbU9',
        description: 'Button to jump to the next failed loop iteration',
      }),
      input: (count) =>
        intl.formatMessage(
          {
            defaultMessage: 'Iteration number, 1 to {count}',
            id: '7IihF3',
            description: 'Accessible name of the loop iteration number input',
          },
          { count }
        ),
      position: (current, count) =>
        intl.formatMessage(
          { defaultMessage: '{current} of {count}', id: 'oMf+lk', description: 'Current loop iteration out of the total iteration count' },
          { current, count }
        ),
      failedDestinationSelect: intl.formatMessage({
        defaultMessage: 'Jump to failed iteration',
        id: '5QUuaP',
        description: 'Accessible name and tooltip for failed-iteration destination select in the loop pager',
      }),
      failedDestinationPrompt: intl.formatMessage({
        defaultMessage: 'Failed…',
        id: '5UmjLL',
        description: 'Visible compact prompt text for failed-iteration destination select in the loop pager',
      }),
      failedDestinationOption: (iteration) =>
        intl.formatMessage(
          {
            defaultMessage: 'Failed iteration {iteration}',
            id: '9hDI1a',
            description: 'Option label for a failed loop iteration destination in the loop pager',
          },
          { iteration }
        ),
      failedDestinationRange: (first, last) =>
        intl.formatMessage(
          {
            defaultMessage: 'Failed iterations {first} to {last}',
            id: 'YrNXP1',
            description: 'Submenu label for a range of failed loop iteration destinations',
          },
          { first, last }
        ),
    }),
    [intl]
  );

  // Paging and failed jumps share one handler so failed jumps also honor `useToolRun` (tool runs keep
  // their own index) and move focus like ordinary paging. Legacy `LoopsPager` is left unchanged.
  const onChange = useCallback(
    (index: number) => {
      dispatch(useToolRun ? setToolRunIndex({ page: index, nodeId: scopeId }) : setRunIndex({ page: index, nodeId: scopeId }));
      focusElement?.(index, scopeId);
    },
    [dispatch, focusElement, scopeId, useToolRun]
  );

  if (!loopsCount || isError || collapsed || isFetching) {
    return null;
  }

  return (
    <div data-automation-id={`msla-pager-v2-${replaceWhiteSpaceWithUnderscore(scopeId)}`}>
      <NodeIterationPager
        current={currentPage}
        count={loopsCount}
        onChange={onChange}
        // Legacy only shows failed jumps when failures exist; an empty list would render disabled buttons.
        failed={failedRepetitions?.length ? failedRepetitions : undefined}
        failedDestinations={canPickFailures ? failedRepetitions : undefined}
        compactFailureNavigation={inLoopCardRow && normalizedType === constants.NODE.TYPE.FOREACH}
        editable
        strings={strings}
      />
    </div>
  );
};
