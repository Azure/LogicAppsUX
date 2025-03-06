import type { RunDisplayItem } from './types';
import type { IColumn, IContextualMenuItem } from '@fluentui/react';
import { DefaultButton, DetailsListLayoutMode, Link, SelectionMode, ShimmeredDetailsList } from '@fluentui/react';
import { useState } from 'react';
import type { FormatDateOptions } from 'react-intl';
import { useIntl } from 'react-intl';

export interface RunHistoryProps {
  items: RunDisplayItem[];
  loading?: boolean;
  onOpenRun(run: RunDisplayItem): void;
}

const ContextMenuKeys = {
  SHOW_RUN: 'SHOW_RUN',
} as const;
type ContextMenuKeys = (typeof ContextMenuKeys)[keyof typeof ContextMenuKeys];
const RunHistoryColumnKeys = {
  CONTEXT_MENU: 'contextMenu',
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

export const RunHistory: React.FC<RunHistoryProps> = ({ items, loading = false, onOpenRun }) => {
  const intl = useIntl();
  const [useUTC, setUseUTC] = useState(false);

  const Resources = {
    CONTEXT_MENU: intl.formatMessage({
      defaultMessage: 'Show run menu',
      id: 'd094c74d9588',
      description: 'Button text to show run menu',
    }),
    DURATION: intl.formatMessage({
      defaultMessage: 'Duration',
      id: '0d96777e378a',
      description: 'Column header text for duration',
    }),
    IDENTIFIER: intl.formatMessage({
      defaultMessage: 'Identifier',
      id: 'df7f961c61f6',
      description: 'Column header text for identifier',
    }),
    SHOW_RUN: intl.formatMessage({
      defaultMessage: 'Show run',
      id: 'ea388eeeddc2',
      description: 'Menu item text for show run',
    }),
    START_TIME: intl.formatMessage({
      defaultMessage: 'Start time',
      id: '04a2f4646626',
      description: 'Column header text for start time',
    }),
    LOCAL_TIME: intl.formatMessage({
      defaultMessage: 'Local time',
      id: 'bfe140f0da43',
      description: 'Column header text for local time',
    }),
    STATUS: intl.formatMessage({
      defaultMessage: 'Status',
      id: '16c94d8054d6',
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
      fieldName: RunHistoryColumnKeys.CONTEXT_MENU,
      isResizable: true,
      key: RunHistoryColumnKeys.CONTEXT_MENU,
      minWidth: 0,
      name: '',
    },
  ];

  const handleRenderItemColumn = (item: RunDisplayItem, _?: number, column?: IColumn): React.ReactNode | undefined => {
    switch (column?.key) {
      case RunHistoryColumnKeys.CONTEXT_MENU:
        return (
          <DefaultButton
            aria-label={Resources.CONTEXT_MENU}
            menuProps={{
              items: [{ key: ContextMenuKeys.SHOW_RUN, name: Resources.SHOW_RUN }],
              onItemClick: (_, menuItem?: IContextualMenuItem) => {
                if (menuItem?.key === ContextMenuKeys.SHOW_RUN) {
                  onOpenRun(item);
                }
              },
            }}
            text="…"
          />
        );

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
