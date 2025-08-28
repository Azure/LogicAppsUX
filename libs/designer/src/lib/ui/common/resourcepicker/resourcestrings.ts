import { useIntl } from 'react-intl';

export const useResourceStrings = () => {
  const intl = useIntl();

  return {
    SUBSCRIPTION: intl.formatMessage({
      defaultMessage: 'Subscription',
      id: '5L2vIX',
      description: 'Label for subscription id field',
    }),
    RESOURCE_GROUP: intl.formatMessage({
      defaultMessage: 'Resource group',
      id: 'sgJ5qr',
      description: 'Label for resource group field',
    }),
    LOCATION: intl.formatMessage({
      defaultMessage: 'Location',
      id: '6+L8qX',
      description: 'Label for location field',
    }),
    LOGIC_APP: intl.formatMessage({
      defaultMessage: 'Logic App',
      id: 'CYe4FG',
      description: 'Label for logic app instance field',
    }),
    WORKFLOW_NAME: intl.formatMessage({
      defaultMessage: 'Workflow name',
      id: '9aAkJP',
      description: 'Label for workflow Name field',
    }),
  };
};
