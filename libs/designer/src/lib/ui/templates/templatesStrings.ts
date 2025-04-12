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
      TEMPLATE_NAME: intl.formatMessage({
        defaultMessage: 'Template',
        id: '83Vrgj',
        description: 'Label for template',
      }),
      DESCRIPTION: intl.formatMessage({
        defaultMessage: 'Description',
        id: 'FOoLuS',
        description: 'Label for description',
      }),
    },
    stateTypes: {
      STATEFUL: intl.formatMessage({
        defaultMessage: 'Stateful',
        id: 'Qqmb+W',
        description: 'Dropdown option for stateful type',
      }),
      STATELESS: intl.formatMessage({
        defaultMessage: 'Stateless',
        id: 'cNXS5n',
        description: 'Dropdown option for stateless type',
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
