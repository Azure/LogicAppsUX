import { getIntl } from '@microsoft/logic-apps-shared';
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
    General: intl.formatMessage({
      defaultMessage: 'General',
      id: 'FLeN8N',
      description: 'General section title',
    }),
    ContactInfo: intl.formatMessage({
      defaultMessage: 'Contact info',
      id: 'W621ZA',
      description: 'Contact info section title',
    }),
    Categorization: intl.formatMessage({
      defaultMessage: 'Categorization',
      id: '5Tqzsm',
      description: 'Categorization section title',
    }),
    DisplayName: intl.formatMessage({
      defaultMessage: 'Display name',
      id: 'N6SVax',
      description: 'Display name label',
    }),
    Name: intl.formatMessage({
      defaultMessage: 'Name',
      id: 'gOkIvb',
      description: 'Name label',
    }),
    WorkflowType: intl.formatMessage({
      defaultMessage: 'Workflow type',
      id: 'xBIh0S',
      description: 'Workflow type label',
    }),
    Trigger: intl.formatMessage({
      defaultMessage: 'Trigger',
      id: 'U1Tti2',
      description: 'Trigger label',
    }),
    PublishedBy: intl.formatMessage({
      defaultMessage: 'Published by',
      id: '3Hl3r2',
      description: 'Published by label',
    }),
    Summary: intl.formatMessage({
      defaultMessage: 'Summary',
      id: 'lo77/t',
      description: 'Summary label',
    }),
    Prerequisites: intl.formatMessage({
      defaultMessage: 'Prerequisites',
      id: 'emnH/J',
      description: 'Prerequisites label',
    }),
    Features: intl.formatMessage({
      defaultMessage: 'Features',
      id: 'VIU+CM',
      description: 'Features label',
    }),
    FeaturedConnectors: intl.formatMessage({
      defaultMessage: 'Featured connectors',
      id: 'sROTIO',
      description: 'Featured connectors label',
    }),
    Category: intl.formatMessage({
      defaultMessage: 'Category',
      id: 'a3Vugg',
      description: 'Category label',
    }),
    Tags: intl.formatMessage({
      defaultMessage: 'Tags',
      id: 'SlY7Jz',
      description: 'Tags label',
    }),
    TemplateInformation: intl.formatMessage({
      defaultMessage: 'Template information',
      id: 'am5nER',
      description: 'Template information toast title',
    }),
    Type: intl.formatMessage({
      defaultMessage: 'Type',
      id: 'qBKOEO',
      description: 'Type label',
    }),
    LastSaved: intl.formatMessage({
      defaultMessage: 'Last saved',
      id: 'r0Nvk3',
      description: 'Last saved label',
    }),
    WorkflowDisplayName: intl.formatMessage({
      defaultMessage: 'Workflow display name',
      id: 'JBa1qe',
      description: 'The label for the workflow display name',
    }),
    State: intl.formatMessage({
      defaultMessage: 'State',
      id: 'IG4XXf',
      description: 'Label for workflow state',
    }),
    StateType: intl.formatMessage({
      defaultMessage: 'State type',
      id: 'GkbTLA',
      description: 'Label for workflow state type',
    }),
    TemplateName: intl.formatMessage({
      defaultMessage: 'Template',
      id: '83Vrgj',
      description: 'Label for template',
    }),
    Placeholder: intl.formatMessage({
      defaultMessage: '--',
      id: '5lRHeK',
      description: 'Accessibility label indicating that the value is not set',
    }),
    Description: intl.formatMessage({
      defaultMessage: 'Description',
      id: 'FOoLuS',
      description: 'Label for description',
    }),
    DefaultValue: intl.formatMessage({
      defaultMessage: 'Default value',
      id: 'v5CBNu',
      description: 'Default value label',
    }),
    AllowedValues: intl.formatMessage({
      defaultMessage: 'Allowed values',
      id: 'gl+tO3',
      description: 'Allowed values label',
    }),
    AssociatedWorkflows: intl.formatMessage({
      defaultMessage: 'Associated workflows',
      id: 'cjSsih',
      description: 'Associated workflows label',
    }),
    Required: intl.formatMessage({
      defaultMessage: 'Required',
      id: '2q6Vas',
      description: 'Required label',
    }),
    RequiredOn: intl.formatMessage({
      defaultMessage: 'On',
      id: 'JHp3nE',
      description: 'The aria label for the required parameter on (required)',
    }),
    RequiredOff: intl.formatMessage({
      defaultMessage: 'Off',
      id: '4ZPAvT',
      description: 'The aria label for the required parameter off (not required)',
    }),
    Details: intl.formatMessage({
      defaultMessage: 'Details',
      id: 'pr2lJw',
      description: 'Details label',
    }),
    ParameterName: intl.formatMessage({
      defaultMessage: 'Parameter name',
      id: '2j1xuE',
      description: 'Parameter name label',
    }),
    ParameterDisplayName: intl.formatMessage({
      defaultMessage: 'Parameter display name',
      id: 'uRAbJb',
      description: 'Parameter display name label',
    }),
    RequiredField: intl.formatMessage({
      defaultMessage: 'Required Field',
      id: 'vTxIoS',
      description: 'Required field label',
    }),
    LightModeImage: intl.formatMessage({
      defaultMessage: 'Light mode image',
      id: '5LLxEp',
      description: 'Light mode image label',
    }),
    DarkModeImage: intl.formatMessage({
      defaultMessage: 'Dark mode image',
      id: 'CdxaGY',
      description: 'Dark mode image label',
    }),
    // Aria labels
    WorkflowsListTableLabel: intl.formatMessage({
      defaultMessage: 'Workflows list tabel',
      id: 'om43/8',
      description: 'Aria label for workflows list table',
    }),
    LoadingWorkflowsLabel: intl.formatMessage({
      defaultMessage: 'Loading workflows aria label',
      id: 'dhlB0s',
      description: 'Loading aria-label for workflows list',
    }),
    SelectAllWorkflowsLabel: intl.formatMessage({
      defaultMessage: 'Select all workflows checkbox rows label',
      id: 'FSD5Z4',
      description: 'Aria label for select all workflows checkbox',
    }),
    WorkflowCheckboxRowLabel: intl.formatMessage({
      defaultMessage: 'Select workflow row checkbox label',
      id: 'oChTO9',
      description: 'Accessibility label for the select workflow row checkbox',
    }),
    // Tab labels
    WorkflowsTabLabel: intl.formatMessage({
      defaultMessage: 'Workflows',
      id: 'R7VvvJ',
      description: 'The tab label for the monitoring workflows tab on the configure template wizard',
    }),
    ConnectionsTabLabel: intl.formatMessage({
      defaultMessage: 'Connections',
      id: 'ur+ZvW',
      description: 'The tab label for the monitoring connections tab on the configure template wizard',
    }),
    ParametersTabLabel: intl.formatMessage({
      defaultMessage: 'Parameters',
      id: 'lYAlE9',
      description: 'The tab label for the monitoring parameters tab on the configure template wizard',
    }),
    ProfileTabLabel: intl.formatMessage({
      defaultMessage: 'Profile',
      id: '6ELsbA',
      description: 'The tab label for the monitoring profile tab on the configure template wizard',
    }),
    SettingsTabLabel: intl.formatMessage({
      defaultMessage: 'Settings',
      id: '+IsazR',
      description: 'The tab label for the settings tab on the configure template wizard',
    }),
    ReviewPublishTabLabel: intl.formatMessage({
      defaultMessage: 'Review + publish',
      id: 'FJQUqL',
      description: 'The tab label for the monitoring review and publish tab on the configure template wizard',
    }),
  };
};

export const getLogicAppsCategories = () => {
  const intl = getIntl();
  return [
    {
      value: 'Design Patterns',
      displayName: intl.formatMessage({
        defaultMessage: 'Design Patterns',
        id: '6jUopY',
        description: 'Design Patterns category',
      }),
    },
    {
      value: 'AI',
      displayName: intl.formatMessage({
        defaultMessage: 'AI',
        id: 'w9RxUM',
        description: 'AI category',
      }),
    },
    {
      value: 'B2B',
      displayName: intl.formatMessage({
        defaultMessage: 'B2B',
        id: 'th4Av+',
        description: 'B2B category',
      }),
    },
    {
      value: 'EDI',
      displayName: intl.formatMessage({
        defaultMessage: 'EDI',
        id: 'Gw0u+P',
        description: 'EDI category',
      }),
    },
    {
      value: 'Approval',
      displayName: intl.formatMessage({
        defaultMessage: 'Approval',
        id: '/W2SX+',
        description: 'Approval category',
      }),
    },
    {
      value: 'RAG',
      displayName: intl.formatMessage({
        defaultMessage: 'RAG',
        id: 'Q861hF',
        description: 'RAG category',
      }),
    },
    {
      value: 'Automation',
      displayName: intl.formatMessage({
        defaultMessage: 'Automation',
        id: 'oM6P0z',
        description: 'Automation category',
      }),
    },
    {
      value: 'BizTalk Migration',
      displayName: intl.formatMessage({
        defaultMessage: 'BizTalk Migration',
        id: 'toHITB',
        description: 'BizTalk Migration category',
      }),
    },
    {
      value: 'Mainframe Modernization',
      displayName: intl.formatMessage({
        defaultMessage: 'Mainframe Modernization',
        id: 'mpFlLc',
        description: 'Mainframe Modernization category',
      }),
    },
  ];
};
