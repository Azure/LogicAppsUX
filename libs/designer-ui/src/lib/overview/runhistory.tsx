import type { RunDisplayItem } from './types';
import type { IColumn } from '@fluentui/react';
import { DetailsListLayoutMode, Link, SelectionMode, ShimmeredDetailsList } from '@fluentui/react';
import { Button, Tooltip } from '@fluentui/react-components';
import { DismissCircleRegular, HistoryRegular } from '@fluentui/react-icons';
import { useState } from 'react';
import type { FormatDateOptions } from 'react-intl';
import { useIntl } from 'react-intl';
import { useOverviewStyles } from './styles';

export interface RunHistoryProps {
  items: RunDisplayItem[];
  loading?: boolean;
  pendingRunId?: string;
  onOpenRun(run: RunDisplayItem): void;
  onCancelRun?(run: RunDisplayItem): void;
}

const RunHistoryColumnKeys = {
  ACTIONS: 'actions',
  DURATION: 'duration',
  IDENTIFIER: 'identifier',
  START_TIME: 'startTime',
  STATUS: 'status',
} as const;
export type RunHistoryColumnKeys = (typeof RunHistoryColumnKeys)[keyof typeof RunHistoryColumnKeys];
const dateOptions: FormatDateOptions = {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  hour12: true,
};

export const RunHistory: React.FC<RunHistoryProps> = ({ items, loading = false, pendingRunId, onOpenRun, onCancelRun }) => {
  const intl = useIntl();
  const styles = useOverviewStyles();
  const [useUTC, setUseUTC] = useState(false);

  const Resources = {
    ACTIONS: intl.formatMessage({
      defaultMessage: 'Actions',
      id: 'PkyvtI',
      description: 'Column header text for run actions',
    }),
    CANCEL_RUN: (identifier: string) =>
      intl.formatMessage(
        {
          defaultMessage: 'Cancel run {identifier}',
          id: 'J7Lquu',
          description: 'Accessible label for the button that cancels a workflow run',
        },
        { identifier }
      ),
    OPEN_RUN: (identifier: string) =>
      intl.formatMessage(
        {
          defaultMessage: 'Open run {identifier}',
          id: 'vGTg+5',
          description: 'Accessible label for the button that opens a workflow run',
        },
        { identifier }
      ),
    DURATION: intl.formatMessage({
      defaultMessage: 'Duration',
      id: 'DZZ3fj',
      description: 'Column header text for duration',
    }),
    IDENTIFIER: intl.formatMessage({
      defaultMessage: 'Identifier',
      id: '33+WHG',
      description: 'Column header text for identifier',
    }),
    START_TIME: intl.formatMessage({
      defaultMessage: 'Start time',
      id: 'BKL0ZG',
      description: 'Column header text for start time',
    }),
    LOCAL_TIME: intl.formatMessage({
      defaultMessage: 'Local time',
      id: 'v+FA8N',
      description: 'Column header text for local time',
    }),
    STATUS: intl.formatMessage({
      defaultMessage: 'Status',
      id: 'FslNgF',
      description: 'Column header text for status',
    }),
  };

  const columns: IColumn[] = [
    {
      fieldName: RunHistoryColumnKeys.IDENTIFIER,
      flexGrow: 1,
      isResizable: true,
      key: RunHistoryColumnKeys.IDENTIFIER,
      minWidth: 0,
      name: Resources.IDENTIFIER,
    },
    {
      fieldName: RunHistoryColumnKeys.STATUS,
      isResizable: true,
      key: RunHistoryColumnKeys.STATUS,
      minWidth: 0,
      name: Resources.STATUS,
    },
    {
      fieldName: RunHistoryColumnKeys.START_TIME,
      isResizable: true,
      key: RunHistoryColumnKeys.START_TIME,
      minWidth: 160,
      name: `${Resources.START_TIME} ${useUTC ? '(UTC)' : `(${Resources.LOCAL_TIME})`}`,
      onColumnClick: () => setUseUTC(!useUTC),
    },
    {
      fieldName: RunHistoryColumnKeys.DURATION,
      isResizable: true,
      key: RunHistoryColumnKeys.DURATION,
      minWidth: 0,
      name: Resources.DURATION,
    },
    {
      fieldName: RunHistoryColumnKeys.ACTIONS,
      key: RunHistoryColumnKeys.ACTIONS,
      minWidth: 96,
      name: Resources.ACTIONS,
    },
  ];

  const handleRenderItemColumn = (item: RunDisplayItem, _?: number, column?: IColumn): React.ReactNode | undefined => {
    switch (column?.key) {
      case RunHistoryColumnKeys.ACTIONS: {
        const openRunLabel = Resources.OPEN_RUN(item.identifier);
        const cancelRunLabel = Resources.CANCEL_RUN(item.identifier);

        return (
          <div className={styles.runHistoryActions}>
            <Tooltip content={openRunLabel} relationship="label">
              <Button
                appearance="subtle"
                aria-label={openRunLabel}
                icon={<HistoryRegular data-testid={`open-run-icon-${item.identifier}`} />}
                onClick={() => onOpenRun(item)}
              />
            </Tooltip>
            {item.status.toLowerCase() === 'running' && onCancelRun ? (
              <Tooltip content={cancelRunLabel} relationship="label">
                <Button
                  appearance="subtle"
                  aria-label={cancelRunLabel}
                  disabled={Boolean(pendingRunId)}
                  icon={<DismissCircleRegular data-testid={`cancel-run-icon-${item.identifier}`} />}
                  onClick={() => onCancelRun(item)}
                />
              </Tooltip>
            ) : null}
          </div>
        );
      }

      case RunHistoryColumnKeys.IDENTIFIER:
        return (
          <Link
            onClick={() => {
              onOpenRun(item);
            }}
          >
            {item[column?.fieldName as keyof RunDisplayItem]}
          </Link>
        );

      case RunHistoryColumnKeys.START_TIME: {
        const str = intl.formatDate(item.startTime, dateOptions);
        const utcstr = intl.formatDate(item.startTime, { ...dateOptions, timeZone: 'UTC' });
        return <span>{useUTC ? utcstr : str}</span>;
      }

      default:
        return item[column?.fieldName as keyof RunDisplayItem];
    }
  };

  return (
    <ShimmeredDetailsList
      columns={columns}
      compact
      enableShimmer={loading}
      items={items}
      layoutMode={DetailsListLayoutMode.justified}
      shimmerLines={items.length || 5}
      selectionMode={SelectionMode.none}
      onRenderItemColumn={handleRenderItemColumn}
    />
  );
};
