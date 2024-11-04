import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { Text } from '@fluentui/react-components';
import { Icon, Link } from '@fluentui/react';
import { useIntl } from 'react-intl';
import { useState } from 'react';
import { TemplatesPanelContent, TemplatesPanelHeader } from '@microsoft/designer-ui';
import { getQuickViewTabs } from '../../../../core/templates/utils/helper';
import Markdown from 'react-markdown';
import { useWorkflowTemplate } from '../../../../core/state/templates/templateselectors';
import { Open16Regular } from '@fluentui/react-icons';

export const QuickViewPanel = ({ workflowId, clearDetailsOnClose }: { workflowId: string; clearDetailsOnClose: boolean }) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { templateName, workflowAppName } = useSelector((state: RootState) => ({
    templateName: state.template.templateName,
    workflowAppName: state.workflow.workflowAppName,
  }));
  const { manifest } = useWorkflowTemplate(workflowId);
  const panelTabs = getQuickViewTabs(intl, dispatch, workflowId, clearDetailsOnClose, {
    templateId: templateName ?? '',
    workflowAppName,
    isMultiWorkflow: false,
  });
  const [selectedTabId, setSelectedTabId] = useState<string>(panelTabs[0]?.id);

  if (!manifest) {
    return null;
  }

  const onTabSelected = (tabId: string): void => {
    setSelectedTabId(tabId);
  };

  return (
    <TemplatesPanelContent
      className="msla-template-quickview-tabs"
      tabs={panelTabs}
      selectedTab={selectedTabId}
      selectTab={onTabSelected}
    />
  );
};

export const QuickViewPanelHeader = ({
  title,
  description,
  sourceCodeUrl,
  details,
  features,
}: { title: string; description: string; sourceCodeUrl: string | undefined; details: Record<string, string>; features?: string }) => {
  const intl = useIntl();
  const detailsTags: Record<string, string> = {
    Type: intl.formatMessage({
      defaultMessage: 'Type',
      id: 'tjQdhq',
      description: 'Solution type of the template',
    }),
    By: intl.formatMessage({
      defaultMessage: 'By',
      id: 'nhEgHb',
      description: 'Name of the organization that published this template',
    }),
  };

  return (
    <TemplatesPanelHeader title={title}>
      <div className="msla-template-quickview-tags">
        {Object.keys(detailsTags).map((key: string, index: number, array: any[]) => {
          return (
            <div key={key}>
              <Text className={index === array.length - 1 ? 'msla-template-last-tag' : ''}>
                {detailsTags[key]}: {details[key]}
              </Text>
              {index !== array.length - 1 ? (
                <Icon style={{ padding: '3px 10px 3px 10px', color: '#dedede', fontSize: 10 }} iconName="LocationDot" />
              ) : null}
            </div>
          );
        })}
        {sourceCodeUrl && (
          <Link className="msla-template-quickview-source-code" href={sourceCodeUrl} target="_blank">
            {intl.formatMessage({
              defaultMessage: 'Source code',
              id: 'EFQ56R',
              description: 'Link to the source code of the template',
            })}
            <Open16Regular className="msla-templates-tab-source-code-icon" />
          </Link>
        )}
      </div>
      <Markdown linkTarget="_blank">{description}</Markdown>
      {features && (
        <div className="msla-template-quickview-features">
          <Text>
            {intl.formatMessage({
              defaultMessage: 'Features',
              id: 'SZ78Xp',
              description: 'Title for the features section in the template overview',
            })}
            :
          </Text>
          <Markdown linkTarget="_blank">{features}</Markdown>
        </div>
      )}
    </TemplatesPanelHeader>
  );
};
