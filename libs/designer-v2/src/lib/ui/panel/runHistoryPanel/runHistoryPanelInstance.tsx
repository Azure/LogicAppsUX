import {
  Button,
  Drawer,
  DrawerBody,
  DrawerHeader,
  Field,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  SearchBox,
  Spinner,
  Tag,
  TagGroup,
  Text,
} from '@fluentui/react-components';
import { useAllRuns, useRunsInfiniteQuery } from '../../../core/queries/runs';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { parseErrorMessage } from '@microsoft/logic-apps-shared';
import RunHistoryEntry from './runHistoryEntry';
import { useRunHistoryPanelStyles } from './runHistoryPanel.styles';

const runIdRegex = /^\d{29}CU\d{2,8}$/;

type FilterTypes = 'runId' | 'workflowVersion' | 'status';

interface RunHistoryPanelProps {
  onRefresh?: () => void;
  onRunSelected?: (runId: string) => void;
}

export const RunHistoryPanelInstance = (props: RunHistoryPanelProps) => {
  const intl = useIntl();
  const styles = useRunHistoryPanelStyles();
  const runsQuery = useRunsInfiniteQuery();
  const runs = useAllRuns();

  useEffect(() => {
    runsQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FILTERING
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

  const filtersWithoutRunId = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { runId, ...rest } = filters;
    return rest;
  }, [filters]);

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

  const statusText = intl.formatMessage({
    defaultMessage: 'Status',
    description: 'Status column header',
    id: 'eLQPek',
  });

  const runIdText = intl.formatMessage({
    defaultMessage: 'Run ID',
    description: 'Run ID filter label',
    id: '4rdY7D',
  });

  const workflowVersionText = intl.formatMessage({
    defaultMessage: 'Version',
    description: 'Workflow version filter label',
    id: 'oGINHJ',
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

  const [searchError, setSearchError] = useState<string | null>(null);

  return (
    <Drawer open={true} type={'inline'} separator style={{ width: '100%' }}>
      <DrawerHeader style={{ padding: '10px' }}>
        <Field validationState={searchError ? 'error' : 'none'} validationMessage={searchError}>
          <SearchBox
            placeholder={searchPlaceholder}
            onChange={(_e, data) => {
              addFilterCallback({ key: 'runId', value: undefined });
              if (data.value === '') {
                setSearchError(null);
              } else if (runIdRegex.test(data.value)) {
                addFilterCallback({ key: 'runId', value: data.value });
                // props.onRunSelected(data.value);
                setSearchError(null);
              } else {
                setSearchError(invalidRunId);
              }
            }}
          />
        </Field>
        {Object.keys(filtersWithoutRunId).length > 0 ? (
          <TagGroup
            onDismiss={(_e, data) => {
              addFilterCallback({ key: data.value as FilterTypes, value: undefined });
            }}
            style={{ flexWrap: 'wrap', gap: '4px' }}
          >
            {Object.entries(filtersWithoutRunId).map(([key, value]) => (
              <Tag dismissible dismissIcon={{ 'aria-label': 'remove' }} shape={'circular'} appearance={'brand'} key={key} value={key ?? ''}>
                {getFilterKeyText(key as FilterTypes)}: {value}
              </Tag>
            ))}
          </TagGroup>
        ) : null}
        {runsQuery.error ? (
          <MessageBar intent={'error'} layout={'multiline'}>
            <MessageBarBody>
              <MessageBarTitle>{runsErrorMessageTitle}</MessageBarTitle>
              {parseErrorMessage(runsQuery.error)}
            </MessageBarBody>
          </MessageBar>
        ) : null}
      </DrawerHeader>

      <DrawerBody>
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
                  isSelected={false}
                  onRunSelected={props.onRunSelected ? () => props.onRunSelected?.(run.id) : () => {}}
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
      </DrawerBody>
    </Drawer>
  );
};
