import { defineMessages } from 'react-intl';

export const projectOverviewMessages = defineMessages({
  ACTIONS: { defaultMessage: 'Actions', id: 'UQc9bP', description: 'Column heading for project overview row actions' },
  CALLBACK_UNAVAILABLE: {
    defaultMessage: 'Not available',
    id: '2Gp9gw',
    description: 'Text shown when a workflow callback URL is unavailable',
  },
  CANCEL_RUN: {
    defaultMessage: 'Cancel run for {workflowName}',
    id: 'ixsaOP',
    description: 'Accessible label for cancelling a running workflow run',
  },
  COPY_CALLBACK: {
    defaultMessage: 'Copy callback URL for {workflowName}',
    id: 'hdL1cs',
    description: 'Accessible label for copying a workflow callback URL',
  },
  EMPTY_DESCRIPTION: {
    defaultMessage: 'No workflows were found in this Logic App project.',
    id: 'hIVV1n',
    description: 'Description shown when a Logic App project contains no workflows',
  },
  EMPTY_TITLE: { defaultMessage: 'Empty project', id: '3eP++6', description: 'Title for an empty project overview' },
  FILTER: { defaultMessage: 'Filter workflows', id: '3YZQ4r', description: 'Accessible label for the workflow filter' },
  FILTER_PLACEHOLDER: {
    defaultMessage: 'Filter by workflow name',
    id: 'RurTQy',
    description: 'Placeholder for the workflow name filter',
  },
  LAST_RUN: { defaultMessage: 'Last run', id: 'ZkJ6El', description: 'Column heading for the latest workflow run' },
  LAST_RUN_STATUS: {
    defaultMessage: 'Last run status for {workflowName}: {status}',
    id: 'pfqCAb',
    description: 'Accessible label describing the latest workflow run status',
  },
  LOADING: { defaultMessage: 'Loading project overview', id: 'LylX/b', description: 'Project overview loading status' },
  NO_MATCHES: {
    defaultMessage: 'No workflows match this filter.',
    id: 'g8LXmT',
    description: 'Text shown when the workflow filter has no matches',
  },
  NO_RUNS: { defaultMessage: 'No runs', id: 'NlDrVH', description: 'Status shown when a workflow has no persisted runs' },
  OPEN_LATEST_RUN: {
    defaultMessage: 'Open latest run for {workflowName}',
    id: 'y4G9MH',
    description: 'Accessible label for opening the latest workflow run',
  },
  OPEN_WORKFLOW: {
    defaultMessage: 'Open overview for {workflowName}',
    id: 'jYPqev',
    description: 'Accessible label for opening a workflow overview',
  },
  PARTIAL: {
    defaultMessage: 'Some workflow information is unavailable.',
    id: 'XuKv3I',
    description: 'Status shown when only part of the project overview data is available',
  },
  PROJECT_OVERVIEW: {
    defaultMessage: 'Project overview',
    id: '9H74RL',
    description: 'Title for the project overview page',
  },
  QUERY_FAILED: {
    defaultMessage: 'Run query failed',
    id: '614/hY',
    description: 'Status shown when querying workflow runs fails',
  },
  REFRESH: { defaultMessage: 'Refresh', id: '/EpT5r', description: 'Label for refreshing the project overview' },
  REFRESHING: {
    defaultMessage: 'Refreshing project overview',
    id: 'X6cwLg',
    description: 'Project overview refresh status',
  },
  RETRY: { defaultMessage: 'Retry', id: 'vpfMsf', description: 'Label for retrying project overview startup' },
  RUN_HISTORY_UNAVAILABLE: {
    defaultMessage: 'Run history unavailable',
    id: '039DHD',
    description: 'Status shown when a workflow does not persist run history',
  },
  RUNTIME_STARTING: {
    defaultMessage: 'Runtime starting',
    id: '52W+Sg',
    description: 'Status shown while the project runtime starts',
  },
  RUNTIME_STOPPED: {
    defaultMessage: 'Runtime stopped',
    id: 'hNyHAi',
    description: 'Status shown when the project runtime is stopped',
  },
  RUNTIME_UNAVAILABLE: {
    defaultMessage: 'Runtime unavailable',
    id: 'abpNey',
    description: 'Status shown when the project runtime is unavailable',
  },
  RUNTIME_URL: {
    defaultMessage: 'Runtime URL',
    id: 'Q5dNoX',
    description: 'Column heading for workflow callback URLs',
  },
  START_RUNTIME: {
    defaultMessage: 'Start runtime',
    id: '6RRjM/',
    description: 'Accessible label for starting the project runtime',
  },
  STOP_RUNTIME: {
    defaultMessage: 'Stop runtime',
    id: '+pusFE',
    description: 'Accessible label for stopping the project runtime',
  },
  SORT_ASCENDING: {
    defaultMessage: 'Sort {column} ascending',
    id: 'l4cvKP',
    description: 'Accessible label for sorting a project overview column in ascending order',
  },
  SORT_DESCENDING: {
    defaultMessage: 'Sort {column} descending',
    id: 'rjseAq',
    description: 'Accessible label for sorting a project overview column in descending order',
  },
  WORKFLOW: { defaultMessage: 'Workflow', id: 'GjjDej', description: 'Column heading for workflow names' },
});
