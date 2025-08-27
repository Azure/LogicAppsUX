import { useIntl } from 'react-intl';

export const useCloneStrings = () => {
  const intl = useIntl();

  return {
    sourceSectionTitle: intl.formatMessage({
      defaultMessage: 'Source: Logic Apps Consumption',
      id: '3+rUhW',
      description: 'Title for the source section',
    }),
    sourceDescription: intl.formatMessage({
      defaultMessage: 'Source specifications are automatically populated based on your consumption resource.',
      id: 'ql/lcC',
      description: 'Description for the source section',
    }),
    destinationSectionTitle: intl.formatMessage({
      defaultMessage: 'Destination: Logic Apps Standard',
      id: 'Pnedy5',
      description: 'Title for the destination section',
    }),
    destinationDescription: intl.formatMessage({
      defaultMessage: 'Select the destination to clone your consumption resources to.',
      id: 'GtXpHi',
      description: 'Description for the destination section',
    }),
  };
};
