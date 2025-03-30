import { useIntl } from 'react-intl';

export const useResourceStrings = () => {
  const intl = useIntl();
  return {
    Host: intl.formatMessage({
      defaultMessage: 'Host (SKU)',
      id: 'vM1hcr',
      description: 'The label for the supported skus',
    }),
    Environment: intl.formatMessage({
      defaultMessage: 'Environment',
      id: 'M/3Jq4',
      description: 'The label for the environment field',
    }),
    Status: intl.formatMessage({
      defaultMessage: 'Status',
      id: 'l8leI3',
      description: 'The label for the status field',
    }),
    Standard: intl.formatMessage({
      defaultMessage: 'Standard',
      id: 'nmhiR6',
      description: 'The text for the standard sku',
    }),
    Consumption: intl.formatMessage({
      defaultMessage: 'Consumption',
      id: 'VatSVE',
      description: 'The text for the consumption sku',
    }),
    DevelopmentEnvironment: intl.formatMessage({
      defaultMessage: 'Development',
      id: 'DmZRZn',
      description: 'The text for the development environment',
    }),
    ProductionEnvironment: intl.formatMessage({
      defaultMessage: 'Production',
      id: '0sbIhI',
      description: 'The text for the production environment',
    }),
    Published: intl.formatMessage({
      defaultMessage: 'Published',
      id: 'mdhy9X',
      description: 'The text for the published status',
    }),
    Unpublished: intl.formatMessage({
      defaultMessage: 'Unpublished',
      id: 'pd0whZ',
      description: 'The text for the unpublished status',
    }),
  };
};
