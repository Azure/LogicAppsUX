import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { Text } from '@fluentui/react-components';
import { Icon } from '@fluentui/react';
import { useIntl } from 'react-intl';
import { useState } from 'react';
import { TemplatesPanelContent } from '@microsoft/designer-ui';
import { getQuickViewTabs } from '../../../../core/templates/utils/helper';
import Markdown from 'react-markdown';
import { useDefaultWorkflowTemplate } from '../../../../core/state/templates/templateselectors';

export const QuickViewPanel = () => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { templateName, workflowAppName } = useSelector((state: RootState) => ({
    templateName: state.template.templateName,
    workflowAppName: state.workflow.workflowAppName,
  }));
  const { manifest } = useDefaultWorkflowTemplate() ?? {};
  const panelTabs = getQuickViewTabs(intl, dispatch, {
    templateId: templateName ?? '',
    workflowAppName,
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
  details,
}: { title: string; description: string; details: Record<string, string> }) => {
  return (
    <div className="msla-template-quickview-header">
      <Text className="msla-template-panel-header">{title}</Text>
      <div className="msla-template-quickview-tags">
        {Object.keys(details).map((key: string, index: number, array: any[]) => {
          return (
            <div key={key}>
              <Text className="msla-template-card-tag">
                {key}: {details[key]}
              </Text>
              {index !== array.length - 1 ? (
                <Icon style={{ padding: '3px 10px 3px 10px', color: '#dedede', fontSize: 10 }} iconName="LocationDot" />
              ) : null}
            </div>
          );
        })}
      </div>
      <Markdown linkTarget="_blank">{description}</Markdown>
    </div>
  );
};
