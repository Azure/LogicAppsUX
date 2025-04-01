import { useIntl } from 'react-intl';

export const useTemplatesStrings = () => {
  const intl = useIntl();

  return {
    resourceStrings: {
      SUBSCRIPTION: intl.formatMessage({
        defaultMessage: 'Subscription',
        id: 'K5t+Ia',
        description: 'Label for choosing subscription id.',
      }),
      RESOURCE_GROUP: intl.formatMessage({
        defaultMessage: 'Resource group',
        id: 'BjrVzW',
        description: 'Label for choosing resource group',
      }),
      LOCATION: intl.formatMessage({
        defaultMessage: 'Location',
        id: '9Vk2Sn',
        description: 'Label for choosing location.',
      }),
      LOGIC_APP: intl.formatMessage({
        defaultMessage: 'Logic App',
        id: 'E7jFWU',
        description: 'Label for choosing logic app instance',
      }),
      WORKFLOW_NAME: intl.formatMessage({
        defaultMessage: 'Workflow name',
        id: 'ekM77J',
        description: 'Label for workflow Name',
      }),
      WORKFLOW_DISPLAY_NAME: intl.formatMessage({
        defaultMessage: 'Workflow display name',
        id: 'JBa1qe',
        description: 'The label for the workflow display name',
      }),
      SUMMARY: intl.formatMessage({
        defaultMessage: 'Summary',
        id: 'q1Pd+E',
        description: 'Label for workflow summary',
      }),
      DESCRIPTION: intl.formatMessage({
        defaultMessage: 'Description',
        id: 'ae/C2d',
        description: 'Label for workflow description',
      }),
      PREREQUISITES: intl.formatMessage({
        defaultMessage: 'Prerequisites',
        id: 'wRkRZc',
        description: 'Label for workflow prerequisites',
      }),
      STATE: intl.formatMessage({
        defaultMessage: 'State',
        id: 'IG4XXf',
        description: 'Label for workflow state',
      }),
      GENERAL: intl.formatMessage({
        defaultMessage: 'General',
        id: 'UCxXaz',
        description: 'Label for general section',
      }),
      TEMPLATE_NAME: intl.formatMessage({
        defaultMessage: 'Template',
        id: '83Vrgj',
        description: 'Label for template',
      }),
    },
    ariaLabelStrings: {
      WORKFLOWS_LIST_TABLE_LABEL: intl.formatMessage({
        defaultMessage: 'Workflows list tabel',
        id: 'om43/8',
        description: 'Aria label for workflows list table',
      }),
      LOADING_WORKFLOWS_LABEL: intl.formatMessage({
        defaultMessage: 'Loading workflows aria label',
        id: 'dhlB0s',
        description: 'Loading aria-label for workflows list',
      }),
      SELECT_ALL_WORKFLOWS_LABEL: intl.formatMessage({
        defaultMessage: 'Select all workflows checkbox rows label',
        id: 'FSD5Z4',
        description: 'Aria label for select all workflows checkbox',
      }),
      CHECKBOX_ROW_LABEL: intl.formatMessage({
        defaultMessage: 'Select workflow row checkbox label',
        id: 'oChTO9',
        description: 'Accessibility label for the select workflow row checkbox',
      }),
    },
  };
};

export const useConnectorStatusStrings = () => {
  const intl = useIntl();

  return {
    connected: intl.formatMessage({
      defaultMessage: 'Connected',
      id: 'oOGTSo',
      description: 'Connected text',
    }),
    notConnected: intl.formatMessage({
      defaultMessage: 'Not connected',
      id: 'WxJJcQ',
      description: 'Not Connected text',
    }),
    authenticated: intl.formatMessage({
      defaultMessage: 'Authenticated',
      id: 'iwKxSD',
      description: 'Connection authenticated text',
    }),
    notAuthenticated: intl.formatMessage({
      defaultMessage: 'Not authenticated',
      id: 'QdRn5z',
      description: 'Connection not authenticated text',
    }),
  };
};
