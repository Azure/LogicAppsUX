import { Button, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, Spinner } from '@fluentui/react-components';
import { equals, type Run } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';

import {
  bundleIcon,
  CopyFilled,
  CopyRegular,
  ArrowRedoFilled,
  ArrowRedoRegular,
  DismissCircleFilled,
  DismissCircleRegular,
  MoreVerticalFilled,
  MoreVerticalRegular,
} from '@fluentui/react-icons';
import { useCallback, useMemo } from 'react';
import type { FilterTypes } from './runHistoryPanel';
import { useCancelRun, useResubmitRun, useRun, useRunsInfiniteQuery } from '../../../core/queries/runs';

const CopyIcon = bundleIcon(CopyFilled, CopyRegular);
const ResubmitIcon = bundleIcon(ArrowRedoFilled, ArrowRedoRegular);
const CancelIcon = bundleIcon(DismissCircleFilled, DismissCircleRegular);
const MoreIcon = bundleIcon(MoreVerticalFilled, MoreVerticalRegular);

export const RunMenu = (props: {
  run: Run;
  addFilterCallback?: ({ key, value }: { key: FilterTypes; value: string }) => void;
}) => {
  const { run } = props;

  const intl = useIntl();

  const runId = useMemo(() => run.id.split('/').at(-1) ?? '', [run.id]);

  const copyText = intl.formatMessage({
    defaultMessage: 'Copy run ID',
    description: 'Copy run identifier text',
    id: 'l9A4CM',
  });

  const resubmitText = intl.formatMessage({
    defaultMessage: 'Retry',
    description: 'Resubmit run text',
    id: 'DyiMWE',
  });

  const cancelText = intl.formatMessage({
    defaultMessage: 'Cancel',
    description: 'Cancel run text',
    id: '56TR3P',
  });

  const runsQuery = useRunsInfiniteQuery();
  const runQuery = useRun(run.id);

  const { mutateAsync: resubmitRun } = useResubmitRun(run?.name ?? '', (run?.properties.trigger as any)?.name ?? '');
  const { mutateAsync: cancelRun } = useCancelRun(run?.id ?? '');

  const onCopy = useCallback(
    (e: any) => {
      e.stopPropagation();
      navigator.clipboard.writeText(runId);
    },
    [runId]
  );

  const onResubmit = useCallback(
    async (e: any) => {
      e.stopPropagation();
      await resubmitRun();
      runsQuery.refetch();
    },
    [resubmitRun, runsQuery]
  );

  const onCancel = useCallback(
    async (e: any) => {
      e.stopPropagation();
      await cancelRun();
      runQuery.refetch();
    },
    [cancelRun, runQuery]
  );

  const isDraftRun = equals((run.properties?.workflow as any)?.mode, 'Draft');

  if (runQuery.isFetching) {
    return <Spinner size="extra-tiny" style={{ margin: '0 8px' }} />;
  }

  return (
    <Menu positioning={'after'}>
      <MenuTrigger disableButtonEnhancement>
        <Button
          icon={<MoreIcon />}
          appearance={'transparent'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      </MenuTrigger>

      <MenuPopover>
        <MenuList>
          <MenuItem icon={<CopyIcon />} onClick={onCopy}>
            {copyText}
          </MenuItem>
          {!isDraftRun && (
            <MenuItem icon={<ResubmitIcon />} onClick={onResubmit}>
              {resubmitText}
            </MenuItem>
          )}
          {run.properties.status === 'Running' ? (
            <MenuItem icon={<CancelIcon />} onClick={onCancel}>
              {cancelText}
            </MenuItem>
          ) : null}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};
