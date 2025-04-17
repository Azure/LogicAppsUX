import { useIntl } from 'react-intl';

interface ExportStrings {
  targetDirectoryPath?: string;
}

export const useExportStrings = (props?: ExportStrings) => {
  const intl = useIntl();

  return {
    EXPORT_LOGIC_APP: intl.formatMessage({
      defaultMessage: 'Export logic app',
      id: 'idw/7j',
      description: 'Export logic app text.',
    }),
    EXPORT_STATUS_TITLE: intl.formatMessage({
      defaultMessage: 'Export status',
      id: '3rpbrs',
      description: 'Export status title',
    }),
    EXPORT_NEXT_STEPS_PATH: intl.formatMessage(
      {
        defaultMessage: 'For next steps, review the {path} file.',
        id: 's78iEA',
        description: 'Message for next steps after export',
      },
      {
        path: `${props?.targetDirectoryPath}/.logs/export/README.md`,
      }
    ),
    SELECT_TITLE: intl.formatMessage({
      defaultMessage: 'Select logic apps to export',
      id: 'A5rCk8',
      description: 'Select apps to export title',
    }),
    SELECT_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Select the logic apps that you want to export and combine into a single logic app instance.',
      id: '3rlDsf',
      description: 'Select logic apps to export description',
    }),
    SELECTION: intl.formatMessage({
      defaultMessage: 'Select',
      id: 'jcxLyd',
      description: 'Select logic apps to export description',
    }),
    SELECTION_ALL: intl.formatMessage({
      defaultMessage: 'Select all',
      id: '9dqnHP',
      description: 'Select all logic apps to export description',
    }),
    SELECT_WORKFLOW: intl.formatMessage({
      defaultMessage: 'Select logic app',
      id: 'yLua0Y',
      description: 'Select logic app to export description',
    }),
    LIMIT_INFO: intl.formatMessage({
      defaultMessage: 'Selecting more than 15 logic apps affects the export experience performance.',
      id: 'CB/Oue',
      description: 'Limit on selected logic apps warning text',
    }),
    NO_WORKFLOWS: intl.formatMessage({
      defaultMessage: 'No workflows',
      id: 'MvUPPh',
      description: 'No workflows text',
    }),
    NAME: intl.formatMessage({
      defaultMessage: 'Resource name',
      id: 'dr26iH',
      description: 'Resource name title',
    }),
    RESOURCE_GROUP: intl.formatMessage({
      defaultMessage: 'Resource group',
      id: 'UKCoay',
      description: 'Resource group title',
    }),
    SEARCH_LOGIC_APP: intl.formatMessage({
      defaultMessage: 'Search for logic app',
      id: 'x2g49l',
      description: 'Search for logic app',
    }),
    FILTER_RESOURCE_GROUPS: intl.formatMessage({
      defaultMessage: 'Filter by resource group',
      id: '7KvIpv',
      description: 'Filter by resource group',
    }),
    SEARCH: intl.formatMessage({
      defaultMessage: 'Search...',
      id: 'Xem1jZ',
      description: 'Search placeholder',
    }),
    SEARCH_RESOURCE_GROUP: intl.formatMessage({
      defaultMessage: 'Find and select resource group',
      id: 'xJv0H1',
      description: 'Find and select resource group text',
    }),
    SELECTED_APPS: intl.formatMessage({
      defaultMessage: 'Selected logic apps',
      id: 'fDpDnc',
      description: 'Selected logic apps title',
    }),
  };
};
