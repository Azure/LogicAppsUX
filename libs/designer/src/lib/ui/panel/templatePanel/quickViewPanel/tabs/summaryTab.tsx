import { LogEntryLevel, LoggerService, type Template, getTriggerFromDefinition, isNullOrUndefined } from '@microsoft/logic-apps-shared';
import type { AppDispatch } from '../../../../../core/state/templates/store';
import { useIntl, type IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { closePanel, openPanelView, TemplatePanelView } from '../../../../../core/state/templates/panelSlice';
import { Link, Text } from '@fluentui/react-components';
import type { TemplateTabProps } from '@microsoft/designer-ui';
import { clearTemplateDetails } from '../../../../../core/state/templates/templateSlice';
import Markdown from 'react-markdown';
import { useTemplateManifest, useWorkflowTemplate } from '../../../../../core/state/templates/templateselectors';
import { ConnectionsList } from '../../../../templates/connections/connections';
import { Open16Regular } from '@fluentui/react-icons';
import { isMultiWorkflowTemplate } from '../../../../../core/actions/bjsworkflow/templates';
import { useMemo } from 'react';

export const SummaryPanel = ({ workflowId }: { workflowId: string }) => {
  const intl = useIntl();
  const workflowTemplate = useWorkflowTemplate(workflowId);
  const workflowManifest = useMemo(() => workflowTemplate?.manifest, [workflowTemplate]);
  const workflowDefinition = useMemo(() => workflowTemplate?.workflowDefinition, [workflowTemplate]);
  const templateManifest = useTemplateManifest();
  const isMultiWorkflow = isMultiWorkflowTemplate(templateManifest);
  const templateHasConnections = Object.keys(workflowManifest?.connections || {}).length > 0;
  const detailsTags: Partial<Record<Template.DetailsType, string>> = {
    Type: intl.formatMessage({
      defaultMessage: 'Solution type',
      id: 'JVNRly',
      description: 'Solution type of the template',
    }),
    Trigger: intl.formatMessage({
      defaultMessage: 'Trigger type',
      id: 'DcJBUx',
      description: 'Type of the trigger in the template',
    }),
    By: intl.formatMessage({
      defaultMessage: 'Published by',
      id: 'n+sJ5W',
      description: 'Name of the organization that published this template',
    }),
  };

  return isNullOrUndefined(workflowManifest) || isNullOrUndefined(templateManifest) ? null : (
    <div className="msla-template-overview">
      <div className="msla-template-overview-section">
        <Text className="msla-template-overview-section-title" style={templateHasConnections ? undefined : { marginBottom: '-30px' }}>
          {templateHasConnections
            ? intl.formatMessage({
                defaultMessage: 'Connections included in this template',
                id: 'TnwRGo',
                description: 'Title for the connections section in the template overview tab',
              })
            : intl.formatMessage({
                defaultMessage: 'No connections are needed in this template',
                id: 'j2v8BE',
                description: 'Text to show no connections present in the template.',
              })}
        </Text>
        {templateHasConnections ? <ConnectionsList connections={workflowManifest?.connections ?? {}} /> : null}
      </div>
      {workflowManifest?.prerequisites ? (
        <div className="msla-template-overview-section">
          <Text className="msla-template-overview-section-title">
            {intl.formatMessage({
              defaultMessage: 'Prerequisites',
              id: 'Jk2B0i',
              description: 'Title for the prerequisites section in the template overview tab',
            })}
          </Text>
          <Markdown className="msla-template-markdown" linkTarget="_blank">
            {workflowManifest?.prerequisites}
          </Markdown>
        </div>
      ) : null}
      <div className="msla-template-overview-section">
        <Text className="msla-template-overview-section-title">
          {intl.formatMessage({
            defaultMessage: 'Details',
            id: 'ocW+RF',
            description: 'Title for the details section in the template overview tab',
          })}
        </Text>
        {workflowManifest?.description && (
          <Markdown className="msla-template-overview-section-detail msla-template-markdown" linkTarget="_blank">
            {workflowManifest?.description}
          </Markdown>
        )}
        {workflowManifest?.sourceCodeUrl && (
          <div className="msla-template-overview-section-detail">
            <Text className="msla-template-overview-section-detailkey">
              {intl.formatMessage({
                defaultMessage: 'Source code',
                id: 'UTkcyf',
                description: 'Source code of the template',
              })}
              :
            </Text>
            <Link className="msla-template-quickview-source-code" href={workflowManifest?.sourceCodeUrl} target="_blank">
              {workflowManifest?.sourceCodeUrl}
              <Open16Regular className="msla-templates-tab-source-code-icon" />
            </Link>
          </div>
        )}
        {!isMultiWorkflow && (
          <div className="msla-template-overview-section-detail">
            <Text className="msla-template-overview-section-detailkey">{detailsTags.Type}:</Text>
            <Text>{templateManifest.details.Type}</Text>
          </div>
        )}

        <div className="msla-template-overview-section-detail">
          <Text className="msla-template-overview-section-detailkey">{detailsTags.Trigger}:</Text>
          <Text>{isMultiWorkflow ? getTriggerFromDefinition(workflowDefinition?.triggers ?? {}) : templateManifest.details.Trigger}</Text>
        </div>

        <div className="msla-template-overview-section-detail">
          <Text className="msla-template-overview-section-detailkey">{detailsTags.By}:</Text>
          <Text>{templateManifest.details.By}</Text>
        </div>
      </div>
      {!isMultiWorkflow && templateManifest.tags?.length ? (
        <div className="msla-template-overview-section">
          <Text className="msla-template-overview-section-title">
            {intl.formatMessage({
              defaultMessage: 'Tags',
              id: 'X02GGK',
              description: 'Title for the tags section in the template overview tab',
            })}
          </Text>
          <div className="msla-template-overview-section-tags-section">
            {templateManifest.tags.map((key: string) => (
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
): TemplateTabProps => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.OVERVIEW,
  title: intl.formatMessage({
    defaultMessage: 'Summary',
    id: 'mgD2ZT',
    description: 'The tab label for the monitoring parameters tab on the operation panel',
  }),
  hasError: false,
  content: <SummaryPanel workflowId={workflowId} />,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Use this template',
      id: '5szzYP',
      description: 'Button text to create workflow from this template',
    }),
    primaryButtonOnClick: () => {
      LoggerService().log({
        level: LogEntryLevel.Trace,
        area: 'Templates.overviewTab',
        message: 'Template create button clicked',
        args: [templateId, workflowAppName, `isMultiWorkflowTemplate:${isMultiWorkflow}`],
      });
      dispatch(openPanelView({ panelView: TemplatePanelView.CreateWorkflow }));
    },
    secondaryButtonText: intl.formatMessage({
      defaultMessage: 'Close',
      id: 'FTrMxN',
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
