import { LogEntryLevel, LoggerService, type Template, isNullOrUndefined } from '@microsoft/logic-apps-shared';
import type { AppDispatch } from '../../../../../core/state/templates/store';
import { useIntl, type IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { closePanel, openCreateWorkflowPanelView } from '../../../../../core/state/templates/panelSlice';
import { Link, Text } from '@fluentui/react-components';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import { clearTemplateDetails } from '../../../../../core/state/templates/templateSlice';
import Markdown from 'react-markdown';
import { useWorkflowTemplate } from '../../../../../core/state/templates/templateselectors';
import { ConnectionsList } from '../../../../templates/connections/connections';
import { Open16Regular } from '@fluentui/react-icons';

export const SummaryPanel = ({ workflowId }: { workflowId: string }) => {
  const intl = useIntl();
  const { manifest } = useWorkflowTemplate(workflowId);
  const templateHasConnections = Object.keys(manifest?.connections || {}).length > 0;
  const detailsTags: Record<string, string> = {
    Type: intl.formatMessage({
      defaultMessage: 'Solution type',
      id: 'ms25535197234c',
      description: 'Solution type of the template',
    }),
    Trigger: intl.formatMessage({
      defaultMessage: 'Trigger type',
      id: 'ms0dc2415314b4',
      description: 'Type of the trigger in the template',
    }),
    By: intl.formatMessage({
      defaultMessage: 'Published by',
      id: 'ms9feb09e565de',
      description: 'Name of the organization that published this template',
    }),
  };

  return isNullOrUndefined(manifest) ? null : (
    <div className="msla-template-overview">
      <div className="msla-template-overview-section">
        <Text className="msla-template-overview-section-title" style={templateHasConnections ? undefined : { marginBottom: '-30px' }}>
          {templateHasConnections
            ? intl.formatMessage({
                defaultMessage: 'Connections included in this template',
                id: 'ms4e7c111a85cd',
                description: 'Title for the connections section in the template overview tab',
              })
            : intl.formatMessage({
                defaultMessage: 'No connections are needed in this template',
                id: 'ms8f6bfc0442f1',
                description: 'Text to show no connections present in the template.',
              })}
        </Text>
        {templateHasConnections ? <ConnectionsList connections={manifest.connections} /> : null}
      </div>
      {manifest.prerequisites ? (
        <div className="msla-template-overview-section">
          <Text className="msla-template-overview-section-title">
            {intl.formatMessage({
              defaultMessage: 'Prerequisites',
              id: 'ms264d81d2208f',
              description: 'Title for the prerequisites section in the template overview tab',
            })}
          </Text>
          <Markdown className="msla-template-markdown" linkTarget="_blank">
            {manifest.prerequisites}
          </Markdown>
        </div>
      ) : null}
      <div className="msla-template-overview-section">
        <Text className="msla-template-overview-section-title">
          {intl.formatMessage({
            defaultMessage: 'Details',
            id: 'msa1c5be445f45',
            description: 'Title for the details section in the template overview tab',
          })}
        </Text>
        {manifest?.detailsDescription && (
          <Markdown className="msla-template-overview-section-detail msla-template-markdown" linkTarget="_blank">
            {manifest?.detailsDescription}
          </Markdown>
        )}
        {manifest?.sourceCodeUrl && (
          <div className="msla-template-overview-section-detail">
            <Text className="msla-template-overview-section-detailkey">
              {intl.formatMessage({
                defaultMessage: 'Source code',
                id: 'ms51391cc9f679',
                description: 'Source code of the template',
              })}
              :
            </Text>
            <Link className="msla-template-quickview-source-code" href={manifest?.sourceCodeUrl} target="_blank">
              {manifest?.sourceCodeUrl}
              <Open16Regular className="msla-templates-tab-source-code-icon" />
            </Link>
          </div>
        )}
        {Object.keys(detailsTags).map((key: string) => {
          return (
            <div className="msla-template-overview-section-detail" key={key}>
              <Text className="msla-template-overview-section-detailkey">{detailsTags[key]}:</Text>
              <Text>{manifest.details[key]}</Text>
            </div>
          );
        })}
      </div>
      {manifest.tags?.length ? (
        <div className="msla-template-overview-section">
          <Text className="msla-template-overview-section-title">
            {intl.formatMessage({
              defaultMessage: 'Tags',
              id: 'ms5f4d8618a025',
              description: 'Title for the tags section in the template overview tab',
            })}
          </Text>
          <div className="msla-template-overview-section-tags-section">
            {manifest.tags.map((key: string) => (
              <Text key={key} className="msla-template-overview-section-tag" size={300}>
                {key}
              </Text>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export const summaryTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  workflowId: string,
  clearDetailsOnClose: boolean,
  { templateId, workflowAppName, isMultiWorkflow }: Template.TemplateContext,
  onClose?: () => void
): TemplatePanelTab => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.OVERVIEW,
  title: intl.formatMessage({
    defaultMessage: 'Summary',
    id: 'ms9a00f6653ff7',
    description: 'The tab label for the monitoring parameters tab on the operation panel',
  }),
  hasError: false,
  content: <SummaryPanel workflowId={workflowId} />,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Use this template',
      id: 'mse6ccf360ff97',
      description: 'Button text to create workflow from this template',
    }),
    primaryButtonOnClick: () => {
      LoggerService().log({
        level: LogEntryLevel.Trace,
        area: 'Templates.overviewTab',
        message: 'Template create button clicked',
        args: [templateId, workflowAppName, `isMultiWorkflowTemplate:${isMultiWorkflow}`],
      });
      dispatch(openCreateWorkflowPanelView());
    },
    secondaryButtonText: intl.formatMessage({
      defaultMessage: 'Close',
      id: 'ms153accc4d1cf',
      description: 'Button text for closing the panel',
    }),
    secondaryButtonOnClick: () => {
      dispatch(closePanel());
      if (clearDetailsOnClose) {
        dispatch(clearTemplateDetails());
      }
      onClose?.();
    },
  },
});
