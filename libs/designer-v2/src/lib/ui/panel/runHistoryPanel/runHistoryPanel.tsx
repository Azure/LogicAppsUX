import type { SelectTabEvent, SelectTabData } from '@fluentui/react-components';
import {
  Button,
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
  Tooltip,
} from '@fluentui/react-components';
import { equals, HostService, parseErrorMessage } from '@microsoft/logic-apps-shared';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

import { useAllRuns, useRun, useRunsInfiniteQuery } from '../../../core/queries/runs';
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

const runIdRegex = /^\d{29}CU\d{2,8}$/;

export type FilterTypes = 'runId' | 'workflowVersion' | 'status' | 'mode' | 'timeInterval';

export const RunHistoryPanel = () => {
  const intl = useIntl();

  const dispatch = useDispatch();

  const isMonitoringView = useMonitoringView();

  const styles = useRunHistoryPanelStyles();

  const runsQuery = useRunsInfiniteQuery(isMonitoringView);
  const runs = useAllRuns();
  const selectedRunInstance = useRunInstance();
  const runQuery = useRun(selectedRunInstance?.id);

  // Refetch the runs when the panel is expanded
  useEffect(() => {
    if (isMonitoringView) {
      runsQuery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMonitoringView, selectedRunInstance]);

  // MARK: Filtering
  const [filters, setFilters] = useState<Partial<Record<FilterTypes, string | null>>>({});
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);

  const onCustomDateSelect = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Date | null>>, isEnd: boolean) => (date: Date | null | undefined) => {
      if (!date) {
        setter(null);
        return;
      }
      setter((prev) => {
        const updated = new Date(date);
        if (prev) {
          updated.setHours(prev.getHours(), prev.getMinutes(), isEnd ? 59 : 0, isEnd ? 999 : 0);
        } else if (isEnd) {
          updated.setHours(23, 59, 59, 999);
        }
        return updated;
      });
    },
    []
  );

  const onCustomTimeChange = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Date | null>>, isEnd: boolean) => (_e: unknown, data: { selectedTime: Date | null }) => {
      setter((prev) => {
        const base = prev ? new Date(prev) : new Date();
        if (data.selectedTime) {
          base.setHours(data.selectedTime.getHours(), data.selectedTime.getMinutes(), isEnd ? 59 : 0, isEnd ? 999 : 0);
        } else {
          base.setHours(isEnd ? 23 : 0, isEnd ? 59 : 0, isEnd ? 59 : 0, isEnd ? 999 : 0);
        }
        return base;
      });
    },
    []
  );

  const filteredRuns = useMemo(() => {
    return (
      runs?.filter((run) => {
        if (filters?.['runId'] && run.name !== filters['runId']) {
          return false;
        }
        if (filters?.['workflowVersion'] && (run.properties.workflow as any)?.name !== filters['workflowVersion']) {
          return false;
        }
        if (filters?.['status'] && run.properties.status !== filters['status']) {
          return false;
        }
        if (filters?.['mode'] === 'Draft' && (run.properties.workflow as any)?.mode !== 'Draft') {
          return false;
        }
        if (filters?.['mode'] === 'Prod' && (run.properties.workflow as any)?.mode !== undefined) {
          return false;
        }
        // Time interval filter
        if (filters?.['timeInterval'] && run.properties.startTime) {
          const runTime = new Date(run.properties.startTime).getTime();
          const now = Date.now();
          const interval = filters['timeInterval'];
          if (interval === 'last24h' && runTime < now - Durations.day) {
            return false;
          }
          if (interval === 'last48h' && runTime < now - 2 * Durations.day) {
            return false;
          }
          if (interval === 'last7d' && runTime < now - Durations.week) {
            return false;
          }
          if (interval === 'last14d' && runTime < now - 2 * Durations.week) {
            return false;
          }
          if (interval === 'last30d' && runTime < now - 30 * Durations.day) {
            return false;
          }
          if (interval === 'custom') {
            if (customStart && runTime < customStart.getTime()) {
              return false;
            }
            if (customEnd && runTime > customEnd.getTime()) {
              return false;
            }
          }
        }
        return true;
      }) ?? []
    );
  }, [filters, runs, customStart, customEnd]);

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
    defaultMessage: 'From',
    description: 'Custom time range start label',
    id: '3nbg4r',
  });

  const customEndLabel = intl.formatMessage({
    defaultMessage: 'To',
    description: 'Custom time range end label',
    id: 'BOD0+G',
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

  const statusTags = useMemo(
    () => [
      { value: 'All', children: runStatusTexts['All'] },
      { value: 'Succeeded', children: runStatusTexts['Succeeded'] },
      { value: 'Running', children: runStatusTexts['Running'] },
      { value: 'Failed', children: runStatusTexts['Failed'] },
      { value: 'Cancelled', children: runStatusTexts['Cancelled'] },
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

  // If a runId filter is set, prefetch that run's data
  const { isFetching: isFetchingFilteredRun } = useRun(filters?.['runId'] ?? undefined, runIdRegex.test(filters?.['runId'] ?? ''));

  const compatMountNode = useMemo(() => {
    return document.getElementById('fluent-compat-component-mount') ?? undefined;
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
        style={{ marginRight: '-8px' }}
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
            <div className={styles.flexbox}>
              <Field validationState={searchError ? 'error' : 'none'} validationMessage={searchError} style={{ flex: 1 }}>
                <SearchBox
                  placeholder={searchPlaceholder}
                  defaultValue={filters['runId'] ?? undefined}
                  onChange={(_e, data) => {
                    addFilterCallback({ key: 'runId', value: undefined });
                    if (data.value === '') {
                      setSearchError(null);
                    } else if (runIdRegex.test(data.value)) {
                      addFilterCallback({ key: 'runId', value: data.value });
                      setSearchError(null);
                    } else {
                      setSearchError(invalidRunId);
                    }
                  }}
                  // When the user presses enter, try to open the run if the runId is valid
                  onKeyDown={(e: any) => {
                    if (e.key !== 'Enter') {
                      return;
                    }
                    const value = filters?.['runId'];
                    if (value && runIdRegex.test(value)) {
                      HostService().openRun?.(value);
                    }
                  }}
                />
              </Field>
              <RefreshButton />
              <Tooltip content={toggleFiltersAria} relationship="label">
                <Button
                  appearance="subtle"
                  icon={<FilterIcon />}
                  onClick={() => setFiltersExpanded((prev) => !prev)}
                  aria-label={toggleFiltersAria}
                  style={{ marginRight: '-8px' }}
                />
              </Tooltip>
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
                        onSelectDate={onCustomDateSelect(setCustomStart, false)}
                        style={{ marginBottom: '4px' }}
                        mountNode={compatMountNode}
                      />
                      <TimePicker
                        className={styles.smallInput}
                        size="small"
                        placeholder={selectTimePlaceholder}
                        selectedTime={customStart}
                        onTimeChange={onCustomTimeChange(setCustomStart, false)}
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
                        onSelectDate={onCustomDateSelect(setCustomEnd, true)}
                        style={{ marginBottom: '4px' }}
                        mountNode={compatMountNode}
                      />
                      <TimePicker
                        className={styles.smallInput}
                        size="small"
                        placeholder={selectTimePlaceholder}
                        selectedTime={customEnd}
                        onTimeChange={onCustomTimeChange(setCustomEnd, true)}
                        clearable
                        mountNode={compatMountNode}
                      />
                    </Field>
                  </div>
                )}
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
                {filteredRuns.map((run) => (
                  <RunHistoryEntry
                    key={run.id}
                    runId={run.id}
                    isSelected={selectedRunInstance?.id === run.id}
                    onRunSelected={(id) => {
                      HostService().openRun?.(id);
                      setInRunList(false);
                    }}
                    addFilterCallback={addFilterCallback}
                    size="small"
                  />
                ))}
                {!runsQuery.isFetching && runsQuery.hasNextPage && (
                  <Button
                    onClick={() => runsQuery.fetchNextPage()}
                    appearance="subtle"
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
