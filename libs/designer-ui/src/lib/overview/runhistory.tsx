import {
  DefaultButton,
  DetailsListLayoutMode,
  IColumn,
  IContextualMenuItem,
  Link,
  SelectionMode,
  ShimmeredDetailsList,
} from '@fluentui/react';
import { FormatDateOptions, useIntl } from 'react-intl';
import type { RunDisplayItem } from './types';

export interface RunHistoryProps {
  items: RunDisplayItem[];
  loading: boolean;
  onOpenRun(run: RunDisplayItem): void;
}

enum ContextMenuKeys {
  SHOW_RUN = 'SHOW_RUN',
}

enum RunHistoryColumnKeys {
  CONTEXT_MENU = 'contextMenu',
  DURATION = 'duration',
  IDENTIFIER = 'identifier',
  START_TIME = 'startTime',
  STATUS = 'status',
}

const options: FormatDateOptions = {
  day: 'numeric',
  hour: 'numeric',
  hour12: true,
  minute: 'numeric',
  month: 'numeric',
  second: 'numeric',
  timeZone: 'UTC',
  year: 'numeric',
};

export const RunHistory: React.FC<RunHistoryProps> = ({ items, loading = false, onOpenRun }) => {
  const intl = useIntl();
  const Resources = {
    CONTEXT_MENU: intl.formatMessage({
      defaultMessage: 'Show run menu',
      description: 'Button text to show run menu',
    }),
    DURATION: intl.formatMessage({
      defaultMessage: 'Duration',
      description: 'Column header text for duration',
    }),
    IDENTIFIER: intl.formatMessage({
      defaultMessage: 'Identifier',
      description: 'Column header text for identifier',
    }),
    SHOW_RUN: intl.formatMessage({
      defaultMessage: 'Show run',
      description: 'Menu item text for show run',
    }),
    START_TIME: intl.formatMessage({
      defaultMessage: 'Start time',
      description: 'Column header text for start time',
    }),
    STATUS: intl.formatMessage({
      defaultMessage: 'Status',
      description: 'Column header text for status',
    }),
  };

  const columns: IColumn[] = [
    {
      fieldName: RunHistoryColumnKeys.IDENTIFIER,
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
      minWidth: 200,
      name: Resources.START_TIME,
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

      case RunHistoryColumnKeys.START_TIME:
        return intl.formatDate(item.startTime, options);

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
      selectionMode={SelectionMode.none}
      shimmerLines={1}
      onRenderItemColumn={handleRenderItemColumn}
    />
  );
};
