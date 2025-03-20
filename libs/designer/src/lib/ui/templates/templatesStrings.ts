import { getIntl, type LogicAppsV2 } from '@microsoft/logic-apps-shared';
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

export const getDetailTriggerDisplayValue = (triggers: LogicAppsV2.Triggers): string => {
  const intl = getIntl();
  const detailTriggerStrings = {
    Request: intl.formatMessage({
      defaultMessage: 'Request',
      id: 'VOk0Eh',
      description: 'Trigger belongs to Request category',
    }),
    Recurrence: intl.formatMessage({
      defaultMessage: 'Recurrence',
      id: 'CdyJ6f',
      description: 'Trigger belongs to Recurrence category',
    }),
    Event: intl.formatMessage({
      defaultMessage: 'Event',
      id: '2iq12E',
      description: 'Trigger belongs to Event category',
    }),
  };

  return Object.values(triggers)
    .map((trigger) => detailTriggerStrings[trigger.type as keyof typeof detailTriggerStrings] ?? detailTriggerStrings.Event)
    .join(', ');
};
