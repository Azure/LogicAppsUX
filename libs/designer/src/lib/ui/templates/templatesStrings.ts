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
      BY: intl.formatMessage({
        defaultMessage: 'By',
        id: 'lIVS+K',
        description: 'Name of the organization or developer that published this template',
      }),
      ACCELERATOR: intl.formatMessage({
        defaultMessage: 'Accelerator',
        id: '2Js04W',
        description: 'Label for accelerator template which contains multiple workflows',
      }),
      WORKFLOW: intl.formatMessage({
        defaultMessage: 'Workflow',
        id: 'JsUu6b',
        description: 'Label for workflow template which contains single workflow',
      }),
    },
    connectorKinds: {
      inapp: intl.formatMessage({
        defaultMessage: 'In-app',
        id: 'n6/Zp0',
        description: 'The label for the in-app connector kind',
      }),
      shared: intl.formatMessage({
        defaultMessage: 'Shared',
        id: 'PYku3O',
        description: 'The label for shared connector kind',
      }),
    } as Record<string, string>,
    tabLabelStrings: {
      PreviousButtonText: intl.formatMessage({
        defaultMessage: 'Previous',
        id: 'Q1LEiE',
        description: 'Button text for going back to the previous tab',
      }),
      NextButtonText: intl.formatMessage({
        defaultMessage: 'Next',
        id: 'daThty',
        description: 'Button text for proceeding to the next tab',
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
