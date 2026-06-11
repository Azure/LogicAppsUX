import type { SelectTabEvent, SelectTabData, TagDismissData } from '@fluentui/react-components';
import {
  Button,
  Caption1,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderNavigation,
  DrawerHeaderTitle,
  Field,
  mergeClasses,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  SearchBox,
  Spinner,
  Text,
  TabList,
  Tab,
  Dropdown,
  Option,
  Tag,
  TagGroup,
  Tooltip,
} from '@fluentui/react-components';
import {
  equals,
  HostService,
  LogEntryLevel,
  LoggerService,
  parseErrorMessage,
  RunService,
  type RunFilterOptions,
} from '@microsoft/logic-apps-shared';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

import { useRun, useRunsByIds, useRunsInfiniteQuery } from '../../../core/queries/runs';
import { useRunInstance } from '../../../core/state/workflow/workflowSelectors';
import RunHistoryEntry from './runHistoryEntry';
import { useRunHistoryPanelStyles } from './runHistoryPanel.styles';
import { useMonitoringView } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { useIsRunHistoryCollapsed } from '../../../core/state/panel/panelSelectors';
import { setRunHistoryCollapsed } from '../../../core/state/panel/panelSlice';

import {
  bundleIcon,
  ArrowClockwiseFilled,
  ArrowClockwiseRegular,
  ChevronDoubleLeftFilled,
  ChevronDoubleLeftRegular,
  ArrowLeftFilled,
  ArrowLeftRegular,
  FilterFilled,
  FilterRegular,
  CheckboxCheckedFilled,
  CheckboxCheckedRegular,
  SelectAllOnFilled,
  SelectAllOnRegular,
  SelectAllOffFilled,
  SelectAllOffRegular,
  ArrowRedoFilled,
  ArrowRedoRegular,
  DismissCircleFilled,
  DismissCircleRegular,
  CopyFilled,
  CopyRegular,
} from '@fluentui/react-icons';
import { RunTreeView } from '../runTreeView';
import { useWorkflowHasAgentLoop } from '../../../core/state/designerView/designerViewSelectors';
import { AgentChatContent } from './agentChatContent';
import { RunHistoryEntryInfo } from './runHistoryEntryInfo';
import { RunMenu } from './runMenu';
import StatusIndicator from './statusIndicator';
import { DatePicker } from '@fluentui/react-datepicker-compat';
import { TimePicker } from '@fluentui/react-timepicker-compat';

// MARK: End Imports

const RefreshIcon = bundleIcon(ArrowClockwiseFilled, ArrowClockwiseRegular);
const CollapseIcon = bundleIcon(ChevronDoubleLeftFilled, ChevronDoubleLeftRegular);
const ReturnIcon = bundleIcon(ArrowLeftFilled, ArrowLeftRegular);
const FilterIcon = bundleIcon(FilterFilled, FilterRegular);
const MultiSelectIcon = bundleIcon(CheckboxCheckedFilled, CheckboxCheckedRegular);
const SelectAllIcon = bundleIcon(SelectAllOnFilled, SelectAllOnRegular);
const DeselectAllIcon = bundleIcon(SelectAllOffFilled, SelectAllOffRegular);
const ResubmitIcon = bundleIcon(ArrowRedoFilled, ArrowRedoRegular);
const CancelIcon = bundleIcon(DismissCircleFilled, DismissCircleRegular);
const CopyIcon = bundleIcon(CopyFilled, CopyRegular);

const runIdRegex = /^\d{29}CU\d{2,8}$/;

export type FilterTypes = 'runId' | 'workflowVersion' | 'status' | 'mode' | 'timeInterval';

export const RunHistoryPanel = () => {
  const intl = useIntl();

  const dispatch = useDispatch();

  const isMonitoringView = useMonitoringView();

  const styles = useRunHistoryPanelStyles();

  // MARK: Filtering
  const [filters, setFilters] = useState<Partial<Record<FilterTypes, string | null>>>({});
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);

  // Build server-side filter options from UI filter state
  const serverFilters = useMemo((): RunFilterOptions | undefined => {
    const opts: RunFilterOptions = {};
    if (filters?.['status']) {
      opts.status = filters['status'];
    }

    const interval = filters?.['timeInterval'];
    if (interval && interval !== 'custom') {
      const now = Date.now();
      const durations: Record<string, number> = {
        last24h: Durations.day,
        last48h: 2 * Durations.day,
        last7d: Durations.week,
        last14d: 2 * Durations.week,
        last30d: 30 * Durations.day,
      };
      const duration = durations[interval];
      if (duration) {
        opts.startTimeFrom = new Date(now - duration).toISOString();
      }
    } else if (interval === 'custom') {
      if (customStart) {
        opts.startTimeFrom = customStart.toISOString();
      }
      if (customEnd) {
        // Round up to the end of the selected minute for inclusive filtering
        const endAdjusted = new Date(customEnd);
        endAdjusted.setSeconds(59, 999);
        opts.startTimeTo = endAdjusted.toISOString();
      }
    }

    return opts.status || opts.startTimeFrom || opts.startTimeTo ? opts : undefined;
  }, [filters, customStart, customEnd]);

  const runsQuery = useRunsInfiniteQuery(isMonitoringView, serverFilters);
  const runs = useMemo(() => {
    return (runsQuery.data?.pages ?? []).flatMap((p) => p.runs ?? []);
  }, [runsQuery.data]);

  // When runId filter is set, fetch runs directly by ID (handles old runs not in paginated list)
  const runIdFilterIds = useMemo(() => {
    if (!filters?.['runId']) {
      return [];
    }
    return filters['runId']
      .split(',')
      .map((id) => id.trim())
      .filter((id) => runIdRegex.test(id));
  }, [filters]);
  const runsByIdsQuery = useRunsByIds(runIdFilterIds);

  const selectedRunInstance = useRunInstance();
  const runQuery = useRun(selectedRunInstance?.id);

  // Refetch the runs when the panel is expanded
  useEffect(() => {
    if (isMonitoringView) {
      runsQuery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMonitoringView, selectedRunInstance]);

  const onCustomDateSelect = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Date | null>>, defaultHour = 0, defaultMinute = 0) =>
      (date: Date | null | undefined) => {
        if (!date) {
          setter(null);
          return;
        }
        setter((prev) => {
          const updated = new Date(date);
          if (prev) {
            updated.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
          } else {
            updated.setHours(defaultHour, defaultMinute, 0, 0);
          }
          return updated;
        });
      },
    []
  );

  const onCustomTimeChange = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Date | null>>) => (_e: unknown, data: { selectedTime: Date | null }) => {
      setter((prev) => {
        const base = prev ? new Date(prev) : new Date();
        if (data.selectedTime) {
          base.setHours(data.selectedTime.getHours(), data.selectedTime.getMinutes(), 0, 0);
        } else {
          base.setHours(0, 0, 0, 0);
        }
        return base;
      });
    },
    []
  );

  const filteredRuns = useMemo(() => {
    // When filtering by run IDs, use directly-fetched results instead of paginated list
    const source = runIdFilterIds.length > 0 ? runsByIdsQuery.data : runs;
    return (
      source?.filter((run) => {
        // Client-side filters for properties not supported by the API
        if (filters?.['workflowVersion'] && (run.properties.workflow as any)?.name !== filters['workflowVersion']) {
          return false;
        }
        if (filters?.['mode'] === 'Draft' && (run.properties.workflow as any)?.mode !== 'Draft') {
          return false;
        }
        if (filters?.['mode'] === 'Prod' && (run.properties.workflow as any)?.mode !== undefined) {
          return false;
        }
        return true;
      }) ?? []
    );
  }, [filters, runs, runIdFilterIds, runsByIdsQuery.data]);

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

  // Clear filters when switching views
  useEffect(() => {
    setFilters({});
    setCustomStart(null);
    setCustomEnd(null);
  }, [isMonitoringView]);

  // MARK: INTL

  const runListTitle = intl.formatMessage({
    defaultMessage: 'Run history',
    description: 'Run history panel title',
    id: 'qs+f1b',
  });

  const refreshAria = intl.formatMessage({
    defaultMessage: 'Refresh',
    description: 'Refresh button aria label',
    id: '0a4IGE',
  });

  const noRunsText = intl.formatMessage({
    defaultMessage: 'No runs found',
    description: 'No runs found text',
    id: 'SbHBIZ',
  });

  const runsErrorMessageTitle = intl.formatMessage({
    defaultMessage: 'Failed to load runs',
    description: 'Error message title when runs fail to load',
    id: 'bPyWVY',
  });

  const runErrorMessageTitle = intl.formatMessage({
    defaultMessage: 'Failed to load run details',
    description: 'Error message title when a single run fails to load',
    id: 'GYu5XE',
  });

  const searchPlaceholder = intl.formatMessage({
    defaultMessage: 'Enter run ID',
    description: 'Open by run identifier placeholder',
    id: '9/bPKH',
  });

  const invalidRunId = intl.formatMessage({
    defaultMessage: 'Enter a valid run identifier',
    description: 'Invalid run identifier error message',
    id: 'SwWaHa',
  });

  const loadMoreText = intl.formatMessage({
    defaultMessage: 'Load more',
    description: 'Load more button text',
    id: '5z0Zdm',
  });

  const returnText = intl.formatMessage({
    defaultMessage: 'Return to run list',
    description: 'Return to run list button text',
    id: 'ob2fSf',
  });

  const toggleFiltersAria = intl.formatMessage({
    defaultMessage: 'Toggle filters',
    description: 'Aria label for the toggle filters button',
    id: 'ldBi4y',
  });

  const statusFilterLabel = intl.formatMessage({
    defaultMessage: 'Status',
    description: 'Status filter label',
    id: 'QxEQwD',
  });

  const modeFilterLabel = intl.formatMessage({
    defaultMessage: 'Version',
    description: 'Mode filter label',
    id: 'RXZ+9a',
  });

  const timeIntervalFilterLabel = intl.formatMessage({
    defaultMessage: 'Time range',
    description: 'Time interval filter label',
    id: 'oglOen',
  });

  const customStartLabel = intl.formatMessage({
    defaultMessage: 'Start',
    description: 'Custom time range start label',
    id: 'afCjXx',
  });

  const customEndLabel = intl.formatMessage({
    defaultMessage: 'End',
    description: 'Custom time range end label',
    id: 'oua+Hn',
  });

  const selectDatePlaceholder = intl.formatMessage({
    defaultMessage: 'Select date',
    description: 'Placeholder for date picker input',
    id: 'IU8Zu9',
  });

  const selectTimePlaceholder = intl.formatMessage({
    defaultMessage: 'Select time',
    description: 'Placeholder for time picker input',
    id: 'sqeFva',
  });

  const runStatusTexts: Record<string, string> = {
    All: intl.formatMessage({ defaultMessage: 'All', description: 'All run statuses', id: 'bHpFLq' }),
    Succeeded: intl.formatMessage({ defaultMessage: 'Succeeded', description: 'Succeeded status', id: 'NIfcbE' }),
    Running: intl.formatMessage({ defaultMessage: 'In progress', description: 'Running status', id: 'eXcejw' }),
    Failed: intl.formatMessage({ defaultMessage: 'Failed', description: 'Failed status', id: 'Mrge1g' }),
    Cancelled: intl.formatMessage({ defaultMessage: 'Cancelled', description: 'Cancelled status', id: 'xfIp1j' }),
    Waiting: intl.formatMessage({ defaultMessage: 'Waiting', description: 'Waiting status', id: 'F67pEe' }),
  };

  const modeTexts: Record<string, string> = {
    All: intl.formatMessage({ defaultMessage: 'All', description: 'All run modes', id: 'cZqrL1' }),
    Prod: intl.formatMessage({ defaultMessage: 'Production', description: 'Production run mode', id: 'sZw20A' }),
    Draft: intl.formatMessage({ defaultMessage: 'Draft', description: 'Draft run mode', id: 'YGKVSj' }),
  };

  const timeIntervalTexts: Record<string, string> = {
    All: intl.formatMessage({ defaultMessage: 'All', description: 'All time intervals', id: 'sXFMqZ' }),
    last24h: intl.formatMessage({ defaultMessage: 'Last 24 hours', description: 'Last 24 hours filter', id: 'rbVW+z' }),
    last48h: intl.formatMessage({ defaultMessage: 'Last 48 hours', description: 'Last 48 hours filter', id: 'Ul4k7r' }),
    last7d: intl.formatMessage({ defaultMessage: 'Last 7 days', description: 'Last 7 days filter', id: 'v80mnx' }),
    last14d: intl.formatMessage({ defaultMessage: 'Last 14 days', description: 'Last 14 days filter', id: 'W7l+j+' }),
    last30d: intl.formatMessage({ defaultMessage: 'Last 30 days', description: 'Last 30 days filter', id: 'X0/aJy' }),
    custom: intl.formatMessage({ defaultMessage: 'Custom range', description: 'Custom time range filter', id: 'PPssRb' }),
  };

  const treeViewTitle = intl.formatMessage({
    defaultMessage: 'Log',
    description: 'Tree view tab title',
    id: 'O0HlIg',
  });

  const chatViewTitle = intl.formatMessage({
    defaultMessage: 'Agent activity',
    description: 'Chat view tab title',
    id: 'YV6qd0',
  });

  const toggleMultiSelectAria = intl.formatMessage({
    defaultMessage: 'Toggle multi-select',
    description: 'Aria label for the multi-select toggle button',
    id: 'CS/1SY',
  });

  const selectAllAria = intl.formatMessage({
    defaultMessage: 'Select all',
    description: 'Aria label for select all button',
    id: '/ZyaN4',
  });

  const deselectAllAria = intl.formatMessage({
    defaultMessage: 'Deselect all',
    description: 'Aria label for deselect all button',
    id: '1webqh',
  });

  const retrySelectedText = intl.formatMessage({
    defaultMessage: 'Retry',
    description: 'Retry selected runs button text',
    id: 'oKxHWW',
  });

  const cancelSelectedText = intl.formatMessage({
    defaultMessage: 'Cancel',
    description: 'Cancel selected runs button text',
    id: 't8HhGz',
  });

  const copySelectedText = intl.formatMessage({
    defaultMessage: 'Copy run IDs',
    description: 'Copy selected run IDs button text',
    id: '5qdGCJ',
  });

  const [searchError, setSearchError] = useState<string | null>(null);

  // MARK: Drawer resize

  const animationFrame = useRef(0);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isResizingWidth, setIsResizingWidth] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(400);

  const startResizingWidth = useCallback(() => setIsResizingWidth(true), []);
  const stopResizingWidth = useCallback(() => setIsResizingWidth(false), []);

  const resize = useCallback(
    ({ clientX }: { clientX: number }) => {
      animationFrame.current = requestAnimationFrame(() => {
        if (isResizingWidth && sidebarRef.current) {
          const newSidebarWidth = clientX - sidebarRef.current.getBoundingClientRect().left;
          if (newSidebarWidth < 320) {
            setSidebarWidth(320);
            return;
          }
          setSidebarWidth(newSidebarWidth);
        }
      });
    },
    [isResizingWidth]
  );

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizingWidth);

    return () => {
      cancelAnimationFrame(animationFrame.current);
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizingWidth);
    };
  }, [resize, stopResizingWidth]);

  // MARK: ----

  const isRunHistoryCollapsed = useIsRunHistoryCollapsed();
  const [inRunList, setInRunList] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  // MARK: Multi-select
  const [multiSelectEnabled, setMultiSelectEnabled] = useState(false);
  const [multiSelectedIds, setMultiSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkActionInProgress, setIsBulkActionInProgress] = useState(false);
  const lastMultiSelectIndex = useRef<number | null>(null);

  const toggleMultiSelect = useCallback(() => {
    setMultiSelectEnabled((prev) => {
      if (prev) {
        setMultiSelectedIds(new Set());
        lastMultiSelectIndex.current = null;
      }
      return !prev;
    });
  }, []);

  const toggleRunMultiSelect = useCallback(
    (runId: string, shiftKey?: boolean) => {
      const currentIndex = filteredRuns.findIndex((r) => r.id === runId);

      if (shiftKey && lastMultiSelectIndex.current !== null && currentIndex !== -1) {
        const start = Math.min(lastMultiSelectIndex.current, currentIndex);
        const end = Math.max(lastMultiSelectIndex.current, currentIndex);
        setMultiSelectedIds((prev) => {
          const next = new Set(prev);
          for (let i = start; i <= end; i++) {
            next.add(filteredRuns[i].id);
          }
          return next;
        });
      } else {
        setMultiSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(runId)) {
            next.delete(runId);
          } else {
            next.add(runId);
          }
          return next;
        });
      }

      lastMultiSelectIndex.current = currentIndex;
    },
    [filteredRuns]
  );

  const selectAllRuns = useCallback(() => {
    setMultiSelectedIds(new Set(filteredRuns.map((r) => r.id)));
  }, [filteredRuns]);

  const deselectAllRuns = useCallback(() => {
    setMultiSelectedIds(new Set());
  }, []);

  const selectedCountText = intl.formatMessage(
    {
      defaultMessage: '{count} selected',
      description: 'Number of selected runs',
      id: 'nUCvFK',
    },
    { count: multiSelectedIds.size }
  );

  const selectedRunDetails = useMemo(() => {
    const selected = filteredRuns.filter((r) => multiSelectedIds.has(r.id));
    const resubmittable = selected.filter((r) => !equals((r.properties?.workflow as any)?.mode, 'Draft'));
    const cancellable = selected.filter((r) => r.properties.status === 'Running');
    return {
      total: selected.length,
      resubmittableCount: resubmittable.length,
      cancellableCount: cancellable.length,
    };
  }, [filteredRuns, multiSelectedIds]);

  const retryPartialWarning = intl.formatMessage(
    {
      defaultMessage: 'Retry ({count} of {total} eligible)',
      description: 'Tooltip when only some selected runs can be retried',
      id: 'OtYFr2',
    },
    { count: selectedRunDetails.resubmittableCount, total: selectedRunDetails.total }
  );

  const cancelPartialWarning = intl.formatMessage(
    {
      defaultMessage: 'Cancel ({count} of {total} eligible)',
      description: 'Tooltip when only some selected runs can be cancelled',
      id: 'Fpkufw',
    },
    { count: selectedRunDetails.cancellableCount, total: selectedRunDetails.total }
  );

  const retryTooltip =
    selectedRunDetails.resubmittableCount > 0 && selectedRunDetails.resubmittableCount < selectedRunDetails.total
      ? retryPartialWarning
      : retrySelectedText;

  const cancelTooltip =
    selectedRunDetails.cancellableCount > 0 && selectedRunDetails.cancellableCount < selectedRunDetails.total
      ? cancelPartialWarning
      : cancelSelectedText;

  const onBulkCopyIds = useCallback(() => {
    const ids = [...multiSelectedIds].map((id) => id.split('/').at(-1) ?? '');
    navigator.clipboard.writeText(ids.join(', '));
    LoggerService().log({
      area: 'RunHistoryPanel:bulkCopyIds',
      level: LogEntryLevel.Verbose,
      message: `Copied ${ids.length} run IDs.`,
    });
  }, [multiSelectedIds]);

  const onBulkRetry = useCallback(async () => {
    setIsBulkActionInProgress(true);
    const selectedRuns = filteredRuns.filter((r) => multiSelectedIds.has(r.id) && !equals((r.properties?.workflow as any)?.mode, 'Draft'));
    for (const run of selectedRuns) {
      const triggerName = (run.properties.trigger as any)?.name;
      if (triggerName) {
        try {
          await RunService().resubmitRun?.(run.name, triggerName);
        } catch {
          // continue with remaining runs
        }
      }
    }
    setIsBulkActionInProgress(false);
    runsQuery.refetch();
    runsByIdsQuery.refetch();
    LoggerService().log({
      area: 'RunHistoryPanel:bulkRetry',
      level: LogEntryLevel.Verbose,
      message: `Retried ${selectedRuns.length} runs.`,
    });
  }, [filteredRuns, multiSelectedIds, runsQuery, runsByIdsQuery]);

  const onBulkCancel = useCallback(async () => {
    setIsBulkActionInProgress(true);
    const selectedRuns = filteredRuns.filter((r) => multiSelectedIds.has(r.id) && r.properties.status === 'Running');
    for (const run of selectedRuns) {
      try {
        await RunService().cancelRun(run.id);
      } catch {
        // continue with remaining runs
      }
    }
    setIsBulkActionInProgress(false);
    runsQuery.refetch();
    runsByIdsQuery.refetch();
    LoggerService().log({
      area: 'RunHistoryPanel:bulkCancel',
      level: LogEntryLevel.Verbose,
      message: `Cancelled ${selectedRuns.length} runs.`,
    });
  }, [filteredRuns, multiSelectedIds, runsQuery, runsByIdsQuery]);

  const statusTags = useMemo(
    () => [
      { value: 'All', children: runStatusTexts['All'] },
      { value: 'Succeeded', children: runStatusTexts['Succeeded'] },
      { value: 'Running', children: runStatusTexts['Running'] },
      { value: 'Failed', children: runStatusTexts['Failed'] },
      { value: 'Cancelled', children: runStatusTexts['Cancelled'] },
      { value: 'Waiting', children: runStatusTexts['Waiting'] },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onStatusSelect = useCallback(
    (value: string) => {
      if (!value || equals(value, 'All')) {
        addFilterCallback({ key: 'status', value: undefined });
      } else {
        addFilterCallback({ key: 'status', value });
      }
    },
    [addFilterCallback]
  );

  const modeTags = useMemo(
    () => [
      { value: 'All', children: modeTexts['All'] },
      { value: 'Prod', children: modeTexts['Prod'] },
      { value: 'Draft', children: modeTexts['Draft'] },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onModeSelect = useCallback(
    (value: string) => {
      if (!value || equals(value, 'All')) {
        addFilterCallback({ key: 'mode', value: undefined });
      } else {
        addFilterCallback({ key: 'mode', value });
      }
    },
    [addFilterCallback]
  );

  const timeIntervalTags = useMemo(
    () => [
      { value: 'All', children: timeIntervalTexts['All'] },
      { value: 'last24h', children: timeIntervalTexts['last24h'] },
      { value: 'last48h', children: timeIntervalTexts['last48h'] },
      { value: 'last7d', children: timeIntervalTexts['last7d'] },
      { value: 'last14d', children: timeIntervalTexts['last14d'] },
      { value: 'last30d', children: timeIntervalTexts['last30d'] },
      { value: 'custom', children: timeIntervalTexts['custom'] },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const onTimeIntervalSelect = useCallback(
    (value: string) => {
      if (!value || equals(value, 'All')) {
        addFilterCallback({ key: 'timeInterval', value: undefined });
        setCustomStart(null);
        setCustomEnd(null);
      } else {
        addFilterCallback({ key: 'timeInterval', value });
        if (value !== 'custom') {
          setCustomStart(null);
          setCustomEnd(null);
        }
      }
    },
    [addFilterCallback]
  );

  const chatEnabled = useWorkflowHasAgentLoop();

  const activeFilterTags = useMemo(() => {
    const tags: { key: FilterTypes; label: string; value: string }[] = [];
    if (filters?.['status']) {
      tags.push({ key: 'status', label: statusFilterLabel, value: runStatusTexts[filters['status']] ?? filters['status'] });
    }
    if (filters?.['mode']) {
      tags.push({ key: 'mode', label: modeFilterLabel, value: modeTexts[filters['mode']] ?? filters['mode'] });
    }
    if (filters?.['timeInterval']) {
      tags.push({
        key: 'timeInterval',
        label: timeIntervalFilterLabel,
        value: timeIntervalTexts[filters['timeInterval']] ?? filters['timeInterval'],
      });
    }
    return tags;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, statusFilterLabel, modeFilterLabel, timeIntervalFilterLabel]);

  const [selectedContentTab, setSelectedContentTab] = useState<'tree' | 'chat'>('tree');

  useEffect(() => {
    if (!chatEnabled && selectedContentTab === 'chat') {
      setSelectedContentTab('tree');
    }
  }, [chatEnabled, selectedContentTab]);

  useEffect(() => {
    if (!isMonitoringView) {
      setInRunList(true);
    }
  }, [isMonitoringView]);

  // Track fetching state for run ID lookups
  const isFetchingFilteredRun = runsByIdsQuery.isFetching;

  const [compatMountNode, setCompatMountNode] = useState<HTMLElement | undefined>(undefined);
  useEffect(() => {
    setCompatMountNode(document.getElementById('fluent-compat-component-mount') ?? undefined);
  }, []);

  // MARK: Components

  const CollapseButton = () => (
    <Button appearance="subtle" onClick={() => dispatch(setRunHistoryCollapsed(true))} icon={<CollapseIcon />} />
  );

  const RefreshButton = () => (
    <Tooltip content={refreshAria} relationship="label">
      <Button
        appearance="subtle"
        disabled={runsQuery.isFetching}
        onClick={() => {
          runsQuery.refetch();
          runQuery.refetch();
        }}
        icon={(runsQuery.isRefetching && !runsQuery.isLoading) || isFetchingFilteredRun ? <Spinner size={'tiny'} /> : <RefreshIcon />}
        aria-label={refreshAria}
      />
    </Tooltip>
  );

  const FilterButton = () => (
    <Tooltip content={toggleFiltersAria} relationship="label">
      <Button
        appearance={filtersExpanded ? 'primary' : 'subtle'}
        icon={<FilterIcon />}
        onClick={() => setFiltersExpanded((prev) => !prev)}
        aria-label={toggleFiltersAria}
        aria-pressed={filtersExpanded}
      />
    </Tooltip>
  );

  const MultiSelectButton = () => (
    <Tooltip content={toggleMultiSelectAria} relationship="label">
      <Button
        appearance={multiSelectEnabled ? 'primary' : 'subtle'}
        icon={<MultiSelectIcon />}
        onClick={toggleMultiSelect}
        aria-label={toggleMultiSelectAria}
        aria-pressed={multiSelectEnabled}
      />
    </Tooltip>
  );

  // MARK: Render

  return (
    <Drawer
      ref={sidebarRef}
      position="start"
      open={isMonitoringView && !isRunHistoryCollapsed}
      type="inline"
      surfaceMotion={null}
      style={{ position: 'relative', width: sidebarWidth }}
    >
      <Button
        className={mergeClasses(styles.resizer, isResizingWidth && styles.resizerActive)}
        onMouseDown={startResizingWidth}
        aria-label="Resize drawer"
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={sidebarWidth * 0.01}
        aria-valuemin={240 * 0.01}
        aria-valuemax={100}
      />
      <DrawerHeader>
        <DrawerHeaderNavigation style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px' }}>
          {inRunList ? null : (
            <Button appearance="subtle" color="primary" onClick={() => setInRunList(true)} icon={<ReturnIcon />} size="small">
              {returnText}
            </Button>
          )}
          <div style={{ flexGrow: 1 }} />
          <CollapseButton />
        </DrawerHeaderNavigation>
        {inRunList ? (
          <DrawerHeaderTitle>{runListTitle}</DrawerHeaderTitle>
        ) : selectedRunInstance ? (
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <RunHistoryEntryInfo run={selectedRunInstance as any} />
            <RunMenu run={selectedRunInstance as any} />
          </div>
        ) : null}
        {inRunList ? (
          <>
            <div className={styles.flexbox} style={{ gap: '2px', marginRight: '-8px' }}>
              <Field
                validationState={searchError ? 'error' : 'none'}
                validationMessage={searchError}
                style={{ flex: 1, marginRight: '6px' }}
              >
                <SearchBox
                  placeholder={searchPlaceholder}
                  defaultValue={filters['runId'] ?? undefined}
                  onChange={(_e, data) => {
                    addFilterCallback({ key: 'runId', value: undefined });
                    if (data.value === '') {
                      setSearchError(null);
                    } else {
                      const ids = data.value
                        .split(',')
                        .map((id) => id.trim())
                        .filter(Boolean);
                      if (ids.length > 0 && ids.every((id) => runIdRegex.test(id))) {
                        addFilterCallback({ key: 'runId', value: data.value });
                        setSearchError(null);
                      } else {
                        setSearchError(invalidRunId);
                      }
                    }
                  }}
                  // When the user presses enter, try to open the run if the runId is valid
                  onKeyDown={(e: any) => {
                    if (e.key !== 'Enter') {
                      return;
                    }
                    const value = filters?.['runId'];
                    if (value) {
                      const ids = value
                        .split(',')
                        .map((id: string) => id.trim())
                        .filter(Boolean);
                      const firstValid = ids.find((id: string) => runIdRegex.test(id));
                      if (firstValid) {
                        HostService().openRun?.(firstValid);
                      }
                    }
                  }}
                />
              </Field>
              <RefreshButton />
              <FilterButton />
              <MultiSelectButton />
            </div>
            {filtersExpanded && (
              <div className={styles.filterContainer}>
                <div className={styles.flexbox}>
                  <Field label={statusFilterLabel} style={{ flex: 1 }}>
                    <Dropdown
                      size="small"
                      value={filters?.['status'] ?? 'All'}
                      defaultValue={'All'}
                      defaultSelectedOptions={[filters?.['status'] ?? 'All']}
                      onActiveOptionChange={(_, data) => {
                        onStatusSelect(data.nextOption?.value as string);
                      }}
                      style={{ minWidth: '0px' }}
                    >
                      {statusTags.map((tag) => (
                        <Option key={tag.value} value={tag.value} text={tag.children}>
                          <StatusIndicator status={tag.value} />
                        </Option>
                      ))}
                    </Dropdown>
                  </Field>
                  <Field label={modeFilterLabel} style={{ flex: 1 }}>
                    <Dropdown
                      size="small"
                      value={filters?.['mode'] ?? 'All'}
                      defaultValue={'All'}
                      defaultSelectedOptions={[filters?.['mode'] ?? 'All']}
                      onActiveOptionChange={(_, data) => {
                        onModeSelect(data.nextOption?.value as string);
                      }}
                      style={{ minWidth: '0px' }}
                    >
                      {modeTags.map((tag) => (
                        <Option key={tag.value} value={tag.value}>
                          {tag.children}
                        </Option>
                      ))}
                    </Dropdown>
                  </Field>
                </div>
                <div className={styles.flexbox}>
                  <Field label={timeIntervalFilterLabel} style={{ flex: 1 }}>
                    <Dropdown
                      size="small"
                      value={filters?.['timeInterval'] ? timeIntervalTexts[filters['timeInterval']] : 'All'}
                      defaultValue={'All'}
                      defaultSelectedOptions={[filters?.['timeInterval'] ?? 'All']}
                      onActiveOptionChange={(_, data) => {
                        onTimeIntervalSelect(data.nextOption?.value as string);
                      }}
                      style={{ minWidth: '0px' }}
                    >
                      {timeIntervalTags.map((tag) => (
                        <Option key={tag.value} value={tag.value}>
                          {tag.children}
                        </Option>
                      ))}
                    </Dropdown>
                  </Field>
                </div>
                {filters?.['timeInterval'] === 'custom' && (
                  <div className={styles.flexbox}>
                    <Field label={customStartLabel} style={{ flex: 1 }}>
                      <DatePicker
                        className={styles.smallInput}
                        size="small"
                        placeholder={selectDatePlaceholder}
                        value={customStart}
                        isMonthPickerVisible={false}
                        onSelectDate={onCustomDateSelect(setCustomStart)}
                        style={{ marginBottom: '4px' }}
                        mountNode={compatMountNode}
                      />
                      <TimePicker
                        className={styles.smallInput}
                        size="small"
                        placeholder={selectTimePlaceholder}
                        dateAnchor={customStart ?? undefined}
                        selectedTime={customStart}
                        onTimeChange={onCustomTimeChange(setCustomStart)}
                        clearable
                        mountNode={compatMountNode}
                      />
                    </Field>
                    <Field label={customEndLabel} style={{ flex: 1, minWidth: 0 }}>
                      <DatePicker
                        className={styles.smallInput}
                        size="small"
                        placeholder={selectDatePlaceholder}
                        value={customEnd}
                        isMonthPickerVisible={false}
                        onSelectDate={onCustomDateSelect(setCustomEnd, 23, 59)}
                        style={{ marginBottom: '4px' }}
                        mountNode={compatMountNode}
                      />
                      <TimePicker
                        className={styles.smallInput}
                        size="small"
                        placeholder={selectTimePlaceholder}
                        dateAnchor={customEnd ?? undefined}
                        selectedTime={customEnd}
                        onTimeChange={onCustomTimeChange(setCustomEnd)}
                        clearable
                        mountNode={compatMountNode}
                      />
                    </Field>
                  </div>
                )}
              </div>
            )}
            {!filtersExpanded && activeFilterTags.length > 0 && (
              <TagGroup
                className={styles.activeFilterTags}
                role="list"
                onDismiss={(_e: unknown, data: TagDismissData) => {
                  const key = data.value as FilterTypes;
                  addFilterCallback({ key, value: undefined });
                  if (key === 'timeInterval') {
                    setCustomStart(null);
                    setCustomEnd(null);
                  }
                }}
              >
                {activeFilterTags.map((tag) => (
                  <Tag
                    key={tag.key}
                    size="small"
                    shape="rounded"
                    appearance="brand"
                    dismissible
                    dismissIcon={{ 'aria-label': 'remove' }}
                    value={tag.key}
                  >
                    {tag.label}: {tag.value}
                  </Tag>
                ))}
              </TagGroup>
            )}
            {multiSelectEnabled && (
              <div className={styles.multiSelectBar}>
                <Caption1>{selectedCountText}</Caption1>
                <div className={styles.multiSelectActions}>
                  <Tooltip content={selectAllAria} relationship="label">
                    <Button appearance="subtle" icon={<SelectAllIcon />} size="small" onClick={selectAllRuns} aria-label={selectAllAria} />
                  </Tooltip>
                  <Tooltip content={deselectAllAria} relationship="label">
                    <Button
                      appearance="subtle"
                      icon={<DeselectAllIcon />}
                      size="small"
                      onClick={deselectAllRuns}
                      aria-label={deselectAllAria}
                    />
                  </Tooltip>
                  <Tooltip content={retryTooltip} relationship="label">
                    <Button
                      appearance="subtle"
                      icon={<ResubmitIcon />}
                      size="small"
                      onClick={onBulkRetry}
                      disabled={selectedRunDetails.resubmittableCount === 0 || isBulkActionInProgress}
                      aria-label={retryTooltip}
                    />
                  </Tooltip>
                  <Tooltip content={cancelTooltip} relationship="label">
                    <Button
                      appearance="subtle"
                      icon={<CancelIcon />}
                      size="small"
                      onClick={onBulkCancel}
                      disabled={selectedRunDetails.cancellableCount === 0 || isBulkActionInProgress}
                      aria-label={cancelTooltip}
                    />
                  </Tooltip>
                  <Tooltip content={copySelectedText} relationship="label">
                    <Button
                      appearance="subtle"
                      icon={<CopyIcon />}
                      size="small"
                      onClick={onBulkCopyIds}
                      disabled={multiSelectedIds.size === 0}
                      aria-label={copySelectedText}
                    />
                  </Tooltip>
                </div>
              </div>
            )}
            {runsQuery.error ? (
              <MessageBar intent={'error'} layout={'multiline'}>
                <MessageBarBody>
                  <MessageBarTitle>{runsErrorMessageTitle}</MessageBarTitle>
                  {parseErrorMessage(runsQuery.error)}
                </MessageBarBody>
              </MessageBar>
            ) : null}
          </>
        ) : (
          <TabList
            selectedValue={selectedContentTab}
            onTabSelect={(_: SelectTabEvent, data: SelectTabData) => setSelectedContentTab(data.value as 'tree' | 'chat')}
          >
            <Tab value="tree">{treeViewTitle}</Tab>
            <Tab value="chat" disabled={!chatEnabled}>
              {chatViewTitle}
            </Tab>
          </TabList>
        )}
      </DrawerHeader>

      <DrawerBody>
        {inRunList ? (
          <div style={{ margin: '4px -16px' }}>
            {!runsQuery.isFetching && filteredRuns?.length === 0 ? (
              <Text className={styles.noRunsText} align={'center'}>
                {noRunsText}
              </Text>
            ) : (
              <>
                {filteredRuns.map((run, index) => (
                  <RunHistoryEntry
                    key={run.id}
                    runId={run.id}
                    isSelected={selectedRunId === run.name || selectedRunInstance?.id === run.id}
                    onRunSelected={(id) => {
                      setSelectedRunId(id);
                      HostService().openRun?.(id);
                    }}
                    onRunOpened={(id) => {
                      setSelectedRunId(id);
                      HostService().openRun?.(id);
                      setInRunList(false);
                    }}
                    addFilterCallback={addFilterCallback}
                    showTeachingBubble={index === 0}
                    size="small"
                    multiSelectEnabled={multiSelectEnabled}
                    isMultiSelected={multiSelectedIds.has(run.id)}
                    onMultiSelectToggle={toggleRunMultiSelect}
                  />
                ))}
                {runsQuery.hasNextPage && runIdFilterIds.length === 0 && (
                  <Button
                    onClick={() => runsQuery.fetchNextPage()}
                    appearance="subtle"
                    disabled={runsQuery.isFetching}
                    style={{
                      margin: '16px auto',
                      display: 'block',
                    }}
                  >
                    {loadMoreText}
                  </Button>
                )}
              </>
            )}
            {(runsQuery.isLoading || runsQuery.isFetchingNextPage) && <Spinner style={{ padding: '16px' }} />}
          </div>
        ) : runQuery.error ? (
          <MessageBar intent={'error'} layout={'multiline'}>
            <MessageBarBody>
              <MessageBarTitle>{runErrorMessageTitle}</MessageBarTitle>
              {parseErrorMessage(runQuery.error)}
            </MessageBarBody>
          </MessageBar>
        ) : equals(selectedContentTab, 'tree') ? (
          <div style={{ margin: '16px -16px' }}>
            <RunTreeView />
            {runQuery.isLoading || runQuery.isFetching ? <Spinner style={{ padding: '16px' }} /> : null}
          </div>
        ) : equals(selectedContentTab, 'chat') ? (
          <AgentChatContent />
        ) : null}
      </DrawerBody>
    </Drawer>
  );
};

const Durations = {
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  year: 365 * 24 * 60 * 60 * 1000,
};
