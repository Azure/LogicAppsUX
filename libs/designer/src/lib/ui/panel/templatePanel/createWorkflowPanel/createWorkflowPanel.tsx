import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { closePanel, selectPanelTab, TemplatePanelView } from '../../../../core/state/templates/panelSlice';
import { type TemplatePanelTab, TemplatesPanelContent, TemplatesPanelFooter, TemplatesPanelHeader } from '@microsoft/designer-ui';
import { ChevronDown16Regular, ChevronUp16Regular } from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { Text } from '@fluentui/react-components';
import { Label, Panel, PanelType } from '@fluentui/react';
import Markdown from 'react-markdown';
import { useCreateWorkflowPanelTabs } from './usePanelTabs';
import { isMultiWorkflowTemplate } from '../../../../core/actions/bjsworkflow/templates';
import type { CreateWorkflowHandler } from '../../../templates';
import { useExistingWorkflowNames } from '../../../../core/queries/template';
import { clearTemplateDetails } from '../../../../core/state/templates/templateSlice';

export interface CreateWorkflowTabProps {
  isCreating: boolean;
  previousTabId?: string;
  nextTabId?: string;
  hasError: boolean;
  shouldClearDetails: boolean;
  isTemplateNameLocked?: boolean;
}

export interface CreateWorkflowPanelProps {
  createWorkflow?: CreateWorkflowHandler;
  clearDetailsOnClose?: boolean;
  onClose?: () => void;
}

const layerProps = {
  hostId: 'msla-layer-host',
  eventBubblingEnabled: true,
};

export const CreateWorkflowPanel = ({ createWorkflow, onClose, clearDetailsOnClose = true }: CreateWorkflowPanelProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { refetch: refetchWorkflowNames } = useExistingWorkflowNames();
  const { selectedTabId, manifest, isOpen, isCreateView, currentPanelView, isTemplateNameLocked } = useSelector((state: RootState) => ({
    selectedTabId: state.panel.selectedTabId,
    manifest: state.template.manifest,
    isOpen: state.panel.isOpen,
    isCreateView: state.workflow.isCreateView,
    currentPanelView: state.panel.currentPanelView,
    isTemplateNameLocked: state.template.isTemplateNameLocked,
  }));
  const isMultiWorkflow = useMemo(() => !!manifest && isMultiWorkflowTemplate(manifest), [manifest]);

  const panelTabs: TemplatePanelTab[] = useCreateWorkflowPanelTabs({
    isMultiWorkflowTemplate: isMultiWorkflow,
    createWorkflow: createWorkflow ?? (() => Promise.resolve()),
  });

  const resources = {
    multiWorkflowCreateTitle: intl.formatMessage({
      defaultMessage: 'Create workflows from template',
      id: '5pSOjg',
      description: 'Panel header title for creating workflows',
    }),
    updatedWorkflowTitle: intl.formatMessage({
      defaultMessage: 'Update workflow from template',
      id: '5zW+oj',
      description: 'Panel header title for updating the workflow',
    }),
  };

  useEffect(() => {
    if (isOpen) {
      refetchWorkflowNames();
    }
  }, [isOpen, refetchWorkflowNames]);

  const handleSelectTab = (tabId: string): void => {
    dispatch(selectPanelTab(tabId));
  };

  const dismissPanel = useCallback(() => {
    if (isTemplateNameLocked) {
      return;
    }

    dispatch(closePanel());

    if (clearDetailsOnClose) {
      dispatch(clearTemplateDetails());
    }

    onClose?.();
  }, [isTemplateNameLocked, clearDetailsOnClose, dispatch, onClose]);

  const onRenderHeaderContent = useCallback(
    () => (
      <CreateWorkflowPanelHeader
        headerTitle={isMultiWorkflow ? resources.multiWorkflowCreateTitle : isCreateView ? undefined : resources.updatedWorkflowTitle}
        title={manifest?.title ?? ''}
        description={manifest?.description ?? ''}
      />
    ),
    [
      isMultiWorkflow,
      resources.multiWorkflowCreateTitle,
      resources.updatedWorkflowTitle,
      isCreateView,
      manifest?.title,
      manifest?.description,
    ]
  );

  const selectedTabProps = selectedTabId ? panelTabs?.find((tab) => tab.id === selectedTabId) : panelTabs[0];
  const onRenderFooterContent = useCallback(
    () => (selectedTabProps?.footerContent ? <TemplatesPanelFooter showPrimaryButton={true} {...selectedTabProps?.footerContent} /> : null),
    [selectedTabProps?.footerContent]
  );

  return (
    <Panel
      styles={{ main: { padding: '0 20px', zIndex: 1000 }, content: { paddingLeft: '0px' } }}
      isLightDismiss
      type={PanelType.custom}
      customWidth={'50%'}
      isOpen={isOpen && currentPanelView === TemplatePanelView.CreateWorkflow}
      onDismiss={dismissPanel}
      hasCloseButton={!isTemplateNameLocked}
      onRenderHeader={onRenderHeaderContent}
      onRenderFooterContent={onRenderFooterContent}
      layerProps={layerProps}
      isFooterAtBottom={true}
    >
      <TemplatesPanelContent tabs={panelTabs} selectedTab={selectedTabId ?? panelTabs?.[0]?.id} selectTab={handleSelectTab} />
    </Panel>
  );
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
