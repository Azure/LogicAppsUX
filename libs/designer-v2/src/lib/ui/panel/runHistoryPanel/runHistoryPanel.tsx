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
  InteractionTag,
  TagGroup,
  Text,
  InteractionTagPrimary,
  TabList,
  Tab,
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
  DismissFilled,
  DismissRegular,
  ArrowLeftFilled,
  ArrowLeftRegular,
  TaskListLtrFilled,
  TaskListLtrRegular,
  ChatFilled,
  ChatRegular,
} from '@fluentui/react-icons';
import { RunTreeView } from '../runTreeView';
import { useWorkflowHasAgentLoop } from '../../../core/state/designerView/designerViewSelectors';
import { AgentChatContent } from './agentChatContent';

// MARK: End Imports

const RefreshIcon = bundleIcon(ArrowClockwiseFilled, ArrowClockwiseRegular);
const DismissIcon = bundleIcon(DismissFilled, DismissRegular);
const ReturnIcon = bundleIcon(ArrowLeftFilled, ArrowLeftRegular);
const TreeViewIcon = bundleIcon(TaskListLtrFilled, TaskListLtrRegular);
const ChatIcon = bundleIcon(ChatFilled, ChatRegular);

const runIdRegex = /^\d{29}CU\d{2,8}$/;

export type FilterTypes = 'runId' | 'workflowVersion' | 'status';

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
        return true;
      }) ?? []
    );
  }, [filters, runs]);

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
  }, [isMonitoringView]);

  // MARK: INTL

  const runListTitle = intl.formatMessage({
    defaultMessage: 'Run history',
    description: 'Run history panel title',
    id: 'qs+f1b',
  });

  const runLogTitle = intl.formatMessage({
    defaultMessage: 'Run log',
    description: 'Run log panel title',
    id: 'J4accH',
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
    defaultMessage: 'Search',
    description: 'Search by run identifier placeholder',
    id: '6jJvtY',
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

  const runStatusTexts: Record<string, string> = {
    All: intl.formatMessage({ defaultMessage: 'All', description: 'All run statuses', id: 'bHpFLq' }),
    Succeeded: intl.formatMessage({ defaultMessage: 'Succeeded', description: 'Succeeded status', id: 'NIfcbE' }),
    Running: intl.formatMessage({ defaultMessage: 'Running', description: 'Running status', id: 'GRJfCY' }),
    Failed: intl.formatMessage({ defaultMessage: 'Failed', description: 'Failed status', id: 'Mrge1g' }),
    Cancelled: intl.formatMessage({ defaultMessage: 'Cancelled', description: 'Cancelled status', id: 'xfIp1j' }),
  };

  const treeViewTitle = intl.formatMessage({
    defaultMessage: 'Action log',
    description: 'Tree view tab title',
    id: 'QllS1g',
  });

  const chatViewTitle = intl.formatMessage({
    defaultMessage: 'Chat history',
    description: 'Chat view tab title',
    id: '5XK9XY',
  });

  // MARK: Components

  const CloseButton = () => <Button appearance="subtle" onClick={() => dispatch(setRunHistoryCollapsed(true))} icon={<DismissIcon />} />;

  const RefreshButton = () => (
    <Button
      appearance="subtle"
      disabled={runsQuery.isFetching}
      onClick={() => {
        runsQuery.refetch();
        runQuery.refetch();
      }}
      icon={runsQuery.isRefetching && !runsQuery.isLoading ? <Spinner size={'tiny'} /> : <RefreshIcon />}
      aria-label={refreshAria}
      style={{ marginRight: '-8px' }}
    />
  );

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

  const chatEnabled = useWorkflowHasAgentLoop();
  const [selectedContentTab, setSelectedContentTab] = useState<'tree' | 'chat'>('tree');

  useEffect(() => {
    if (!chatEnabled && selectedContentTab === 'chat') {
      setSelectedContentTab('tree');
    }
  }, [chatEnabled, selectedContentTab]);

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
          <CloseButton />
        </DrawerHeaderNavigation>
        <DrawerHeaderTitle>{inRunList ? runListTitle : runLogTitle}</DrawerHeaderTitle>
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
            </div>
            <TagGroup size="small">
              {statusTags.map((tag) => (
                <InteractionTag
                  key={tag.value}
                  value={tag.value}
                  onClick={() => onStatusSelect(tag.value)}
                  selected={filters?.['status'] === tag.value || (equals(tag.value, 'All') && !filters?.['status'])}
                >
                  <InteractionTagPrimary>{tag.children}</InteractionTagPrimary>
                </InteractionTag>
              ))}
            </TagGroup>
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
            style={{ justifyContent: 'center', gap: '16px' }}
          >
            <Tab value="tree" icon={<TreeViewIcon />}>
              {treeViewTitle}
            </Tab>
            <Tab value="chat" icon={<ChatIcon />} disabled={!chatEnabled}>
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
