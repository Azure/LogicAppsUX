import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { selectPanelTab } from '../../../../core/state/templates/panelSlice';
import { TemplatesPanelContent, TemplatesPanelHeader } from '@microsoft/designer-ui';
import { ChevronDown16Regular, ChevronUp16Regular } from '@fluentui/react-icons';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { Text } from '@fluentui/react-components';
import { Label } from '@fluentui/react';
import Markdown from 'react-markdown';
import { useCreateWorkflowPanelTabs } from './usePanelTabs';
import { isMultiWorkflowTemplate } from '../../../../core/actions/bjsworkflow/templates';
import type { CreateWorkflowHandler } from '../../../templates';
import { useExistingWorkflowNames } from '../../../../core/queries/template';

export interface CreateWorkflowTabProps {
  isCreating: boolean;
  previousTabId?: string;
  nextTabId?: string;
  hasError: boolean;
}

export const CreateWorkflowPanel = ({
  createWorkflow,
}: {
  createWorkflow: CreateWorkflowHandler | undefined;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { refetch: refetchWorkflowNames } = useExistingWorkflowNames();
  const { selectedTabId, manifest, isOpen } = useSelector((state: RootState) => ({
    selectedTabId: state.panel.selectedTabId,
    manifest: state.template.manifest,
    isOpen: state.panel.isOpen,
  }));
  const isMultiWorkflow = useMemo(() => !!manifest && isMultiWorkflowTemplate(manifest), [manifest]);

  const panelTabs = useCreateWorkflowPanelTabs({
    isMultiWorkflowTemplate: isMultiWorkflow,
    createWorkflow: createWorkflow ?? (() => Promise.resolve()),
  });

  useEffect(() => {
    if (isOpen) {
      refetchWorkflowNames();
    }
  }, [isOpen, refetchWorkflowNames]);

  const handleSelectTab = (tabId: string): void => {
    dispatch(selectPanelTab(tabId));
  };
  return <TemplatesPanelContent tabs={panelTabs} selectedTab={selectedTabId ?? panelTabs?.[0]?.id} selectTab={handleSelectTab} />;
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
      defaultMessage: 'Template details',
      id: 'WdO1cs',
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
    <TemplatesPanelHeader title={headerTitle ?? intlText.CREATE_WORKFLOW}>
      <div
        className="msla-template-createworkflow-title"
        onClick={() => {
          setIsOpen(!isOpen);
        }}
      >
        <Text className="msla-template-createworkflow-title-text">{intlText.TEMPLATE_DETAILS}</Text>
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
