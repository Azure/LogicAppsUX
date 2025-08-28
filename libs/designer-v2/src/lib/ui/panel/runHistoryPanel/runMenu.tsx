import { Button, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, Spinner } from '@fluentui/react-components';
import type { Run } from '@microsoft/logic-apps-shared';
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
  addFilterCallback: ({ key, value }: { key: FilterTypes; value: string }) => void;
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
      navigator.clipboard.writeText(runId);
      e.stopPropagation();
    },
    [runId]
  );

  const onResubmit = useCallback(
    async (e: any) => {
      await resubmitRun();
      runsQuery.refetch();
      e.stopPropagation();
    },
    [resubmitRun, runsQuery]
  );

  const onCancel = useCallback(
    async (e: any) => {
      await cancelRun();
      runQuery.refetch();
      e.stopPropagation();
    },
    [cancelRun, runQuery]
  );

  if (runQuery.isFetching) {
    return <Spinner size="extra-tiny" />;
  }

  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <Button icon={<MoreIcon />} appearance={'transparent'} onClick={(e) => e.stopPropagation()} />
      </MenuTrigger>

      <MenuPopover>
        <MenuList>
          <MenuItem icon={<CopyIcon />} onClick={onCopy}>
            {copyText}
          </MenuItem>
          <MenuItem icon={<ResubmitIcon />} onClick={onResubmit}>
            {resubmitText}
          </MenuItem>
          <MenuItem icon={<CancelIcon />} disabled={run.properties.status !== 'Running'} onClick={onCancel}>
            {cancelText}
          </MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );
};
