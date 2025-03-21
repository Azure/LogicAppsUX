import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { closePanel, selectPanelTab, TemplatePanelView } from '../../../../core/state/templates/panelSlice';
import { type TemplateTabProps, TemplateContent, TemplatesPanelFooter, TemplatesPanelHeader } from '@microsoft/designer-ui';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { Panel, PanelType } from '@fluentui/react';
import { useConfigureWorkflowPanelTabs } from './usePanelTabs';

export interface ConfigureWorkflowsTabProps {
  hasError: boolean;
  isSaving: boolean;
  onClosePanel: () => void;
}

export const ConfigureWorkflowsPanel = () => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { selectedTabId, isOpen, currentPanelView } = useSelector((state: RootState) => ({
    selectedTabId: state.panel.selectedTabId,
    isOpen: state.panel.isOpen,
    currentPanelView: state.panel.currentPanelView,
  }));

  const resources = {
    configureWorkflowsTitle: intl.formatMessage({
      defaultMessage: 'Add workflows from existing Logic App',
      id: 'NITwNk',
      description: 'Panel header title for configuring workflows',
    }),
  };

  const revertAllChanges = useCallback(() => {
    //TODO: revert all changes
  }, []);

  const panelTabs: TemplateTabProps[] = useConfigureWorkflowPanelTabs({ onClosePanel: revertAllChanges });

  const handleSelectTab = (tabId: string): void => {
    dispatch(selectPanelTab(tabId));
  };

  const onRenderHeaderContent = useCallback(
    () => (
      <TemplatesPanelHeader title={resources.configureWorkflowsTitle}>
        <div />
      </TemplatesPanelHeader>
    ),
    [resources.configureWorkflowsTitle]
  );

  const dismissPanel = useCallback(() => {
    dispatch(closePanel());
    revertAllChanges();
  }, [dispatch, revertAllChanges]);

  const selectedTabProps = selectedTabId ? panelTabs?.find((tab) => tab.id === selectedTabId) : panelTabs[0];
  const onRenderFooterContent = useCallback(
    () => (selectedTabProps?.footerContent ? <TemplatesPanelFooter showPrimaryButton={true} {...selectedTabProps?.footerContent} /> : null),
    [selectedTabProps?.footerContent]
  );

  if (currentPanelView !== TemplatePanelView.ConfigureWorkflows) {
    return null;
  }

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
      isFooterAtBottom={true}
    >
      <TemplateContent tabs={panelTabs} selectedTab={selectedTabId ?? panelTabs?.[0]?.id} selectTab={handleSelectTab} />
    </Panel>
  );
};
