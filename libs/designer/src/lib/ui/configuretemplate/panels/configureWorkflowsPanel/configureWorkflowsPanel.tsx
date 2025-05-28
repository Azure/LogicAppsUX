import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { closePanel, selectPanelTab, TemplatePanelView } from '../../../../core/state/templates/panelSlice';
import { type TemplateTabProps, TemplateContent, TemplatesPanelFooter, TemplatesPanelHeader } from '@microsoft/designer-ui';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { Panel, PanelType } from '@fluentui/react';
import { useConfigureWorkflowPanelTabs } from './usePanelTabs';
import type { WorkflowTemplateData } from '../../../../core';
import type { Template } from '@microsoft/logic-apps-shared';
import { loadResourceDetailsFromWorkflowSource } from '../../../../core/actions/bjsworkflow/configuretemplate';

export interface ConfigureWorkflowsTabProps {
  onTabClick?: () => void;
  hasError?: boolean;
  disabled?: boolean;
  isPrimaryButtonDisabled: boolean;
  isSaving: boolean;
  onSave?: (status: Template.TemplateEnvironment) => void;
  onClose?: () => void;
  status?: Template.TemplateEnvironment;
  selectedWorkflowsList: Record<string, Partial<WorkflowTemplateData>>;
}

const layerProps = {
  hostId: 'msla-layer-host',
  eventBubblingEnabled: true,
};

export const ConfigureWorkflowsPanel = ({ onSave }: { onSave?: (isMultiWorkflow: boolean) => void }) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { selectedTabId, isOpen, currentPanelView, workflows } = useSelector((state: RootState) => ({
    selectedTabId: state.panel.selectedTabId,
    isOpen: state.panel.isOpen,
    currentPanelView: state.panel.currentPanelView,
    workflows: state.template.workflows,
  }));
  const workflowsExist = Object.keys(workflows).length > 0;

  const resources = {
    addWorkflowsTitle: intl.formatMessage({
      defaultMessage: 'Add workflows from existing logic app',
      id: 'uxUH6P',
      description: 'Panel header title for adding or editing workflows',
    }),
    addEditWorkflowsTitle: intl.formatMessage({
      defaultMessage: 'Add or edit workflows in template',
      id: 'FOhE+h',
      description: 'Panel header title for adding workflows',
    }),
  };

  const handleSelectTab = (tabId: string): void => {
    dispatch(selectPanelTab(tabId));
  };

  const onRenderHeaderContent = useCallback(
    () => (
      <TemplatesPanelHeader title={workflowsExist ? resources.addEditWorkflowsTitle : resources.addWorkflowsTitle}>
        <div />
      </TemplatesPanelHeader>
    ),
    [workflowsExist, resources.addWorkflowsTitle, resources.addEditWorkflowsTitle]
  );

  const dismissPanel = useCallback(() => {
    const workflowSourceId = Object.values(workflows ?? {})?.[0]?.manifest?.metadata?.workflowSourceId;
    if (workflowSourceId) {
      dispatch(loadResourceDetailsFromWorkflowSource({ workflowSourceId }));
    }

    dispatch(closePanel());
  }, [dispatch, workflows]);

  const panelTabs: TemplateTabProps[] = useConfigureWorkflowPanelTabs({ onSave, onClose: dismissPanel });
  const selectedTabProps = selectedTabId ? panelTabs?.find((tab) => tab.id === selectedTabId) : panelTabs[0];
  const onRenderFooterContent = useCallback(
    () => (selectedTabProps?.footerContent ? <TemplatesPanelFooter {...selectedTabProps?.footerContent} /> : null),
    [selectedTabProps?.footerContent]
  );

  return (
    <Panel
      styles={{ main: { padding: '0 20px', zIndex: 1000 }, content: { paddingLeft: '0px' } }}
      isLightDismiss={false}
      type={PanelType.custom}
      customWidth={'50%'}
      isOpen={isOpen && currentPanelView === TemplatePanelView.ConfigureWorkflows}
      onDismiss={dismissPanel}
      onRenderHeader={onRenderHeaderContent}
      onRenderFooterContent={onRenderFooterContent}
      hasCloseButton={true}
      layerProps={layerProps}
      isFooterAtBottom={true}
    >
      <TemplateContent tabs={panelTabs} selectedTab={selectedTabId ?? panelTabs?.[0]?.id} selectTab={handleSelectTab} />
    </Panel>
  );
};
