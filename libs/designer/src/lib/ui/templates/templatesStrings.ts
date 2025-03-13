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
    },
  };
};
