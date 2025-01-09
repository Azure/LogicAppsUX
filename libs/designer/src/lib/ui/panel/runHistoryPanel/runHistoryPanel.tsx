import type { DataGridProps, TableColumnDefinition, TableRowId } from '@fluentui/react-components';
import {
  Button,
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Portal,
  Spinner,
  Tag,
  TagGroup,
} from '@fluentui/react-components';
import { getRun, useRuns } from '../../../core/queries/runs';
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { toFriendlyDurationString, type Run } from '@microsoft/logic-apps-shared';
import StatusIndicator from './statusIndicator';
import { useRunInstance } from '../../../core/state/workflow/workflowSelectors';
import { useIntl } from 'react-intl';
import { useIntervalEffect } from '@react-hookz/web';
import { RunPopover } from './runPopover';
import { parseErrorMessage } from '@microsoft/logic-apps-shared';

import { bundleIcon, DismissFilled, DismissRegular, ArrowClockwiseFilled, ArrowClockwiseRegular } from '@fluentui/react-icons';

const DismissIcon = bundleIcon(DismissFilled, DismissRegular);
const RefreshIcon = bundleIcon(ArrowClockwiseFilled, ArrowClockwiseRegular);

export type FilterTypes = 'runId' | 'workflowVersion' | 'status';

export interface RunHistoryPanelProps {
  collapsed: boolean;
  onRunSelected: (runId: string) => void;
  onClose: () => void;
}

export const RunHistoryPanel = (props: RunHistoryPanelProps) => {
  const intl = useIntl();
  const runs = useRuns(!props.collapsed);

  // Refetch the runs when the panel is expanded
  useEffect(() => {
    if (!props.collapsed) {
      runs.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.collapsed]);

  const selectedRunInstance = useRunInstance();

  // FILTERING
  const [filters, setFilters] = useState<Partial<Record<FilterTypes, string | null>>>({});
  const filteredRuns = useMemo(() => {
    return runs.data?.filter((run) => {
      if (filters?.['runId'] && run.name !== filters['runId']) {
        return false;
      }
      if (filters?.['workflowVersion'] && (run.properties.workflow as any)?.name !== filters['workflowVersion']) {
        return false;
      }
      if (filters?.['status'] && run.properties.status !== filters['status']) {
        return false;
      }
      return true;
    });
  }, [filters, runs.data]);

  const addFilterCallback = useCallback(({ key, value }: { key: FilterTypes; value: string | undefined }) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      if (value) {
        newFilters[key] = value;
      } else {
        delete newFilters[key];
      }
      return newFilters;
    });
  }, []);

  // RESIZE LOGIC
  const animationFrame = useRef<number>(0);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(460);

  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);

  const resize = useCallback(
    ({ clientX }: any) => {
      animationFrame.current = requestAnimationFrame(() => {
        if (isResizing && sidebarRef.current) {
          setSidebarWidth(clientX - sidebarRef.current.getBoundingClientRect().left);
        }
      });
    },
    [isResizing]
  );

  const ResizeComponent: React.FC = () => <div className={`resizer ${isResizing ? 'resizer--active' : ''}`} onMouseDown={startResizing} />;

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);

    return () => {
      cancelAnimationFrame(animationFrame.current);
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  // //

  const statusText = intl.formatMessage({
    defaultMessage: 'Status',
    description: 'Status column header',
    id: 'eLQPek',
  });

  const startTimeText = intl.formatMessage({
    defaultMessage: 'Start time',
    description: 'Start time column header',
    id: 'DeM/yz',
  });

  const durationText = intl.formatMessage({
    defaultMessage: 'Duration',
    description: 'Duration column header',
    id: 'T/7b2y',
  });

  const runIdText = intl.formatMessage({
    defaultMessage: 'Run ID',
    description: 'Run ID filter label',
    id: '4rdY7D',
  });

  const workflowVersionText = intl.formatMessage({
    defaultMessage: 'Workflow version',
    description: 'Workflow version filter label',
    id: 'vzXXFP',
  });

  const refreshAria = intl.formatMessage({
    defaultMessage: 'Refresh',
    description: 'Refresh button aria label',
    id: '0a4IGE',
  });

  const runsErrorMessageTitle = intl.formatMessage({
    defaultMessage: 'Failed to load runs',
    description: 'Error message title when runs fail to load',
    id: 'bPyWVY',
  });

  const getFilterKeyText = useCallback(
    (key: FilterTypes) => {
      switch (key) {
        case 'runId':
          return runIdText;
        case 'workflowVersion':
          return workflowVersionText;
        case 'status':
          return statusText;
        default:
          return '';
      }
    },
    [runIdText, statusText, workflowVersionText]
  );

  const defaultSortState = useMemo<Parameters<NonNullable<DataGridProps['onSortChange']>>[1]>(
    () => ({ sortColumn: 'startTime', sortDirection: 'ascending' }),
    []
  );

  const columns: TableColumnDefinition<Run>[] = useMemo(
    () => [
      createTableColumn<Run>({
        columnId: 'status',
        renderHeaderCell: () => statusText,
        renderCell: (run) => (
          <div style={{ margin: '0px auto' }}>
            <StatusIndicator status={run.properties.status} />
          </div>
        ),
      }),
      createTableColumn<Run>({
        columnId: 'startTime',
        renderHeaderCell: () => startTimeText,
        renderCell: (run) => {
          const date = Date.parse(run.properties.startTime);
          return new Date(date).toLocaleString();
        },
      }),
      createTableColumn<Run>({
        columnId: 'duration',
        renderHeaderCell: () => durationText,
        renderCell: (run) => {
          if (!run.properties.startTime || !run.properties.endTime) {
            return '-';
          }
          const start = new Date(run.properties.startTime);
          const end = new Date(run.properties.endTime);
          return toFriendlyDurationString(start, end, intl);
        },
      }),
      createTableColumn<Run>({
        columnId: 'actions',
        renderHeaderCell: () => (
          <Button
            appearance="subtle"
            disabled={runs.isFetching}
            onClick={() => runs.refetch()}
            icon={runs.isRefetching ? <Spinner size={'tiny'} /> : <RefreshIcon />}
            aria-label={refreshAria}
          />
        ),
        renderCell: (run) => <RunPopover run={run} addFilterCallback={addFilterCallback} />,
      }),
    ],
    [durationText, intl, refreshAria, runs, startTimeText, statusText, addFilterCallback]
  );

  const columnSizing = useMemo(
    () => ({
      status: {
        minWidth: 32,
        defaultWidth: 32,
        idealWidth: 32,
      },
      startTime: {
        defaultWidth: 180,
        idealWidth: 180,
      },
      duration: {
        defaultWidth: 120,
        idealWidth: 120,
      },
      actions: {
        minWidth: 32,
        defaultWidth: 32,
        idealWidth: 32,
      },
    }),
    []
  );

  const [dataGridHeaderPortal, setDataGridHeaderPortal] = useState<HTMLElement | null>();

  return (
    <div style={{ position: 'relative' }}>
      <Drawer
        ref={sidebarRef}
        open={!props.collapsed}
        type={'inline'}
        separator
        onMouseDown={(e) => e.preventDefault()}
        style={{ height: 'inherit', width: `${sidebarWidth}px` }}
      >
        <DrawerHeader>
          <DrawerHeaderTitle action={<Button appearance="subtle" aria-label="Close" icon={<DismissIcon />} onClick={props.onClose} />}>
            Run History
          </DrawerHeaderTitle>
          {Object.keys(filters).length > 0 ? (
            <TagGroup
              onDismiss={(_e, data) => {
                addFilterCallback({ key: data.value as FilterTypes, value: undefined });
              }}
              style={{ flexWrap: 'wrap', gap: '4px' }}
            >
              {Object.entries(filters).map(([key, value]) => (
                <Tag
                  dismissible
                  dismissIcon={{ 'aria-label': 'remove' }}
                  shape={'circular'}
                  appearance={'brand'}
                  key={key}
                  value={key ?? ''}
                >
                  {getFilterKeyText(key as FilterTypes)}: {value}
                </Tag>
              ))}
            </TagGroup>
          ) : null}
          {runs.error ? (
            <MessageBar intent={'error'} layout={'multiline'}>
              <MessageBarBody>
                <MessageBarTitle>{runsErrorMessageTitle}</MessageBarTitle>
                {parseErrorMessage(runs.error)}
              </MessageBarBody>
            </MessageBar>
          ) : null}
          <div ref={setDataGridHeaderPortal} style={{ margin: '8px 8px -8px -8px' }} />
        </DrawerHeader>

        <DrawerBody>
          {runs.isLoading ? (
            <Spinner />
          ) : (
            <div style={{ margin: '0 -8px' }}>
              <DataGrid
                items={filteredRuns ?? []}
                columns={columns}
                defaultSortState={defaultSortState}
                resizableColumns
                columnSizingOptions={columnSizing}
              >
                <Portal mountNode={dataGridHeaderPortal}>
                  <DataGridHeader>
                    <DataGridRow>{({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}</DataGridRow>
                  </DataGridHeader>
                </Portal>
                <DataGridBody<Run>>
                  {({ item, rowId }) => (
                    <RunRow
                      item={item}
                      rowId={rowId}
                      isSelected={selectedRunInstance?.id === item.id}
                      onRunSelected={props.onRunSelected}
                    />
                  )}
                </DataGridBody>
              </DataGrid>
            </div>
          )}
        </DrawerBody>
      </Drawer>
      <ResizeComponent />
    </div>
  );
};

const RunRow = (props: { item: Run; rowId: TableRowId; isSelected: boolean; onRunSelected: (id: string) => void }) => {
  const { item, rowId, isSelected, onRunSelected } = props;

  // If the run is incomplete, refresh it every 10s
  const isRunIncomplete = useMemo(
    () => item.properties.status === 'Running' || item.properties.status === 'Waiting' || item.properties.status === 'Resuming',
    [item.properties.status]
  );
  useIntervalEffect(
    () => {
      getRun(item.id);
    },
    isRunIncomplete ? 1000 * 10 : undefined
  );

  return (
    <DataGridRow<Run> key={rowId} onClick={() => onRunSelected(item.name)} className={isSelected ? 'run-selected' : ''}>
      {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
    </DataGridRow>
  );
};
