import { useIntl } from 'react-intl';

export const useCloneStrings = () => {
  const intl = useIntl();

  return {
    sourceSectionTitle: intl.formatMessage({
      defaultMessage: 'Consumption logic app',
      id: 'iMCTbJ',
      description: 'Title for the source section',
    }),
    sourceDescription: intl.formatMessage({
      defaultMessage: 'Source details are automatically populated based on your Consumption logic app resource.',
      id: 'ozl/lK',
      description: 'Description for the source section',
    }),
    destinationSectionTitle: intl.formatMessage({
      defaultMessage: 'Standard logic app',
      id: 'uoSee3',
      description: 'Title for the destination section',
    }),
    destinationDescription: intl.formatMessage({
      defaultMessage: 'Provide details for the destination Standard logic app resource.',
      id: 'UPk1dq',
      description: 'Description for the destination section',
    }),
    workflowNameDescription: intl.formatMessage({
      defaultMessage: 'Avoid spaces and the following symbols in your workflow name: \\ / : * ? " < > | @, #, $, %, &',
      id: 'ZbeL1D',
      description: 'Description for workflow name field and the expected format of the name.',
    }),
    newWorkflowNameDescription: intl.formatMessage({
      defaultMessage: 'Keep or edit the default name for the destination workflow in the Standard logic app.',
      id: 'mzxUwl',
      description: 'Description for new workflow name',
    }),
  };
};
