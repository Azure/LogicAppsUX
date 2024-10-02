import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { selectPanelTab } from '../../../../core/state/templates/panelSlice';
import { type TemplatePanelTab, TemplatesPanelContent } from '@microsoft/designer-ui';
import { TemplatesPanelHeader } from '@microsoft/designer-ui';
import { ChevronDown16Regular, ChevronUp16Regular } from '@fluentui/react-icons';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Text } from '@fluentui/react-components';
import { Label } from '@fluentui/react';
import Markdown from 'react-markdown';

export interface CreateWorkflowTabProps {
  isCreating: boolean;
  previousTabId?: string;
  nextTabId?: string;
  hasError: boolean;
}

export const CreateWorkflowPanel = ({
  panelTabs,
}: {
  panelTabs: TemplatePanelTab[];
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const selectedTabId = useSelector((state: RootState) => state.panel.selectedTabId) ?? panelTabs[0]?.id;

  const handleSelectTab = (tabId: string): void => {
    dispatch(selectPanelTab(tabId));
  };
  return <TemplatesPanelContent tabs={panelTabs} selectedTab={selectedTabId} selectTab={handleSelectTab} />;
};

export const CreateWorkflowPanelHeader = ({
  headerTitle,
  title,
  description,
}: { title: string; description: string; headerTitle?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const intl = useIntl();

  const intlText = {
    CREATE_WORKFLOW: intl.formatMessage({
      defaultMessage: 'Create a new workflow from template',
      id: 'RZNabt',
      description: 'Panel header title for creating the workflow',
    }),
    TEMPLATE_DETAILS: intl.formatMessage({
      defaultMessage: 'Template Details',
      id: 'ZD8dme',
      description: 'Panel description title for template details, allowing to click to read more',
    }),
    NAME: intl.formatMessage({
      defaultMessage: 'Name',
      id: 'DX9jWz',
      description: 'Description label for template name',
    }),
    DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Description',
      id: 'l9+EbH',
      description: 'Description label for template description',
    }),
  };

  return (
    <TemplatesPanelHeader title={intlText.CREATE_WORKFLOW}>
      <div
        className="msla-template-createworkflow-title"
        onClick={() => {
          setIsOpen(!isOpen);
        }}
      >
        <Text className="msla-template-createworkflow-title-text">{headerTitle ?? intlText.TEMPLATE_DETAILS}</Text>
        {isOpen ? <ChevronUp16Regular /> : <ChevronDown16Regular />}
      </div>
      {isOpen && (
        <div className="msla-template-createworkflow-description-wrapper">
          <div className="msla-template-createworkflow-description">
            <Label className="msla-template-createworkflow-description-title">{intlText.NAME}</Label>
            <Text className="msla-template-createworkflow-description-text">{title}</Text>
          </div>
          <div className="msla-template-createworkflow-description">
            <Label className="msla-template-createworkflow-description-title">{intlText.DESCRIPTION}</Label>
            <Markdown className="msla-template-createworkflow-description-text" linkTarget="_blank">
              {description}
            </Markdown>
          </div>
        </div>
      )}
    </TemplatesPanelHeader>
  );
};
